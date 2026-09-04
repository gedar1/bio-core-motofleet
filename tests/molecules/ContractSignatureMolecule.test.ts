import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import path from "node:path";
import Database from "better-sqlite3";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";

import { runMigrations } from "../../src/infrastructure/database.js";
import { ContractMolecule } from "../../src/molecules/ContractMolecule.js";
import {
  ContractSignatureMolecule,
  type ContractDocumentVersion,
  type ContractEmailService,
} from "../../src/molecules/ContractSignatureMolecule.js";
import { ContractAuditService } from "../../src/infrastructure/ContractAuditService.js";
import { TokenService } from "../../src/infrastructure/TokenService.js";
import { PdfValidator } from "../../src/infrastructure/PdfValidator.js";
import type { ILogger } from "../../src/infrastructure/logger.js";
import type {
  DocumentStorage,
  DocumentMetadata,
  StoredDocument,
  TemporaryDocument,
  StoredDocumentEntry,
  TemporaryDocumentEntry,
} from "../../src/infrastructure/DocumentStorage.js";
import type { RetentionDeletionRequest } from "../../src/infrastructure/DocumentStorage.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../src/domains/errors.js";
import { PdfValidationError } from "../../src/domains/contractSignature.js";
import { createContractSignaturePublicRoutes } from "../../src/routes/contract-signature.public.routes.js";
import { createContractSignatureAdminRoutes } from "../../src/routes/contract-signature.admin.routes.js";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a real in-memory SQLite database with all migrations applied. */
function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  const migrationsDir = path.resolve("src/migrations");
  runMigrations(db, migrationsDir);
  return db;
}

/** Minimal no-op logger for tests. */
const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => noopLogger,
};

/** Generates a minimal valid PDF buffer using pdf-lib. */
async function makeMinimalPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------------------
// In-memory DocumentStorage implementation
// ---------------------------------------------------------------------------

class MemoryDocumentStorage implements DocumentStorage {
  private readonly objects = new Map<string, Buffer>();
  private readonly temporaries = new Map<string, Buffer>();
  public quarantinedKeys: string[] = [];
  private keyCounter = 0;

  async writeTemporary(
    source: Readable | AsyncIterable<Uint8Array>,
  ): Promise<TemporaryDocument> {
    const chunks: Buffer[] = [];
    for await (const chunk of source) {
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks);
    const key = `tmp_${"a".repeat(63)}${(this.keyCounter++).toString(16).slice(-1)}`;
    this.temporaries.set(key, bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return { temporaryKey: key, sizeBytes: bytes.length, sha256 };
  }

  async finalize(
    temporary: TemporaryDocument,
    validate?: (metadata: DocumentMetadata) => Promise<void> | void,
  ): Promise<StoredDocument> {
    const bytes = this.temporaries.get(temporary.temporaryKey);
    if (!bytes) throw new Error("Temporary not found");
    if (validate) {
      await validate({
        sizeBytes: temporary.sizeBytes,
        sha256: temporary.sha256,
      });
    }
    const storageKey = `doc_${"b".repeat(63)}${(this.keyCounter++).toString(16).slice(-1)}`;
    this.objects.set(storageKey, bytes);
    this.temporaries.delete(temporary.temporaryKey);
    return {
      storageKey,
      sizeBytes: temporary.sizeBytes,
      sha256: temporary.sha256,
    };
  }

  async discardTemporary(temporary: TemporaryDocument): Promise<void> {
    this.temporaries.delete(temporary.temporaryKey);
  }

  async openRead(storageKey: string): Promise<Readable> {
    const bytes = this.objects.get(storageKey);
    if (!bytes) throw new Error("Object not found");
    return Readable.from(bytes);
  }

  async stat(storageKey: string): Promise<DocumentMetadata | null> {
    const bytes = this.objects.get(storageKey);
    if (!bytes) return null;
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return { sizeBytes: bytes.length, sha256 };
  }

  async enumerate(): Promise<readonly StoredDocumentEntry[]> {
    return [];
  }

  async enumerateTemporary(): Promise<readonly TemporaryDocumentEntry[]> {
    return [];
  }

  async quarantine(storageKey: string): Promise<void> {
    const bytes = this.objects.get(storageKey);
    if (bytes) {
      this.quarantinedKeys.push(storageKey);
      this.objects.delete(storageKey);
    }
  }

  async deleteForRetention(
    _storageKey: string,
    _request: RetentionDeletionRequest,
  ): Promise<void> {}

  async deleteQuarantinedForRetention(
    _storageKey: string,
    _request: RetentionDeletionRequest,
  ): Promise<void> {}
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

interface SeedIds {
  adminId: string;
  riderId: string;
  motorcycleId: string;
  contractId: string;
}

function seedMinimalData(db: Database.Database): SeedIds {
  const adminId = uuidv4();
  const riderId = uuidv4();
  const motorcycleId = uuidv4();
  const contractId = uuidv4();
  const cosignerId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO admins (id, name, email, password_hash, role, status)
     VALUES (?, 'Test Admin', 'admin@test.com', 'hash', 'operator', 'active')`,
  ).run(adminId);

  db.prepare(
    `INSERT INTO riders
       (id, name, phone, email, address, password_hash,
        license_number, license_expiry, insurance_number, insurance_expiry,
        bond_amount, emergency_contact_name, emergency_contact_phone, status, available)
     VALUES (?, 'Test Rider', '3001234567', 'rider@test.com', 'Calle 1', 'hash',
             'LIC-001', '2030-01-01', 'INS-001', '2030-01-01',
             1000000, 'Emergency', '3009876543', 'active', 0)`,
  ).run(riderId);

  db.prepare(
    `INSERT INTO motorcycles
       (id, plate, brand, model, year, color, engine_cc,
        soat_expiry, inspection_expiry, status)
     VALUES (?, 'ABC123', 'Honda', 'CB190R', 2022, 'Rojo', 190,
             '2030-01-01', '2030-01-01', 'rented')`,
  ).run(motorcycleId);

  db.prepare(
    `INSERT INTO cosigners
       (id, rider_id, name, address, phone, relationship, identity_document)
     VALUES (?, ?, 'Cosigner Test', 'Calle 2', '3002222222', 'friend', 'CC-111')`,
  ).run(cosignerId, riderId);

  db.prepare(
    `INSERT INTO rental_contracts
       (id, rider_id, motorcycle_id, start_date, end_date,
        monthly_amount, payment_day, status, created_at, updated_at)
     VALUES (?, ?, ?, '2024-01-01', '2025-01-01', 500000, 5, 'active', ?, ?)`,
  ).run(contractId, riderId, motorcycleId, now, now);

  return { adminId, riderId, motorcycleId, contractId };
}

function buildMolecule(
  db: Database.Database,
  storage: MemoryDocumentStorage,
  emailService?: ContractEmailService,
  now = new Date("2025-02-28T23:30:00.000Z"),
) {
  const auditService = new ContractAuditService(db, {
    now: () => new Date(now),
  });
  const tokenService = new TokenService(db, {
    now: () => new Date(now),
    outboxEncryptionKey: Buffer.alloc(32, 7),
  });
  const pdfValidator = new PdfValidator();
  return new ContractSignatureMolecule(
    db,
    noopLogger,
    storage,
    pdfValidator,
    tokenService,
    auditService,
    emailService,
    { now: () => new Date(now) },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ContractSignatureMolecule", () => {
  let db: Database.Database;
  let storage: MemoryDocumentStorage;
  let molecule: ContractSignatureMolecule;
  let seeds: SeedIds;

  beforeEach(() => {
    db = createTestDb();
    storage = new MemoryDocumentStorage();
    molecule = buildMolecule(db, storage);
    seeds = seedMinimalData(db);
  });

  // -------------------------------------------------------------------------
  // createCase
  // -------------------------------------------------------------------------

  describe("createCase", () => {
    it("inserts the case row and records a case_created audit event on success", () => {
      const result = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });

      expect(result.id).toBeTruthy();
      expect(result.contract_id).toBe(seeds.contractId);
      expect(result.rider_id).toBe(seeds.riderId);
      expect(result.motorcycle_id).toBe(seeds.motorcycleId);
      expect(result.document_status).toBe("preparado");
      expect(result.formalization_status).toBe("pendiente_formalizacion");
      expect(result.created_by).toBe(seeds.adminId);
      expect(result.original_version_id).toBeNull();

      // Verify audit event was recorded
      const auditService = new ContractAuditService(db);
      const auditPage = auditService.listForCase(result.id);
      const caseCreatedEvent = auditPage.data.find(
        (e) => e.event_type === "case_created",
      );
      expect(caseCreatedEvent).toBeDefined();
      expect(caseCreatedEvent?.result).toBe("success");
      expect(caseCreatedEvent?.actor_type).toBe("admin");
      expect(caseCreatedEvent?.actor_id).toBe(seeds.adminId);
    });

    it("keeps contractual_status separate from legacy_contract_status in the admin response", async () => {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });
      const legacyContract = new ContractMolecule(db, noopLogger);
      legacyContract.renew(seeds.contractId, "2100-01-01");

      const app = express();
      app.use("/api", createContractSignatureAdminRoutes(molecule));
      const token = jwt.sign(
        {
          id: seeds.adminId,
          role: "admin",
          email: "admin@test.com",
        },
        process.env.JWT_SECRET ?? "default-secret-change-me",
      );

      const response = await request(app)
        .get(`/api/contract-signatures/${signatureCase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.contractual_status).toBe("pendiente_formalizacion");
      expect(response.body.formalization_status).toBe(
        "pendiente_formalizacion",
      );
      expect(response.body.legacy_contract_status).toBe("renewed");
      expect(response.body.document_status).toBe("preparado");
    });

    it("throws ConflictError when called twice for the same contract", () => {
      molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });

      expect(() =>
        molecule.createCase({
          contractId: seeds.contractId,
          adminId: seeds.adminId,
        }),
      ).toThrow(ConflictError);
    });

    it("throws NotFoundError for a non-existent contract", () => {
      expect(() =>
        molecule.createCase({ contractId: uuidv4(), adminId: seeds.adminId }),
      ).toThrow(NotFoundError);
    });

    it("throws NotFoundError for a non-existent admin", () => {
      expect(() =>
        molecule.createCase({
          contractId: seeds.contractId,
          adminId: uuidv4(),
        }),
      ).toThrow(NotFoundError);
    });

    it("throws ConflictError for a cancelled contract", () => {
      db.prepare(
        "UPDATE rental_contracts SET status = 'cancelled' WHERE id = ?",
      ).run(seeds.contractId);

      expect(() =>
        molecule.createCase({
          contractId: seeds.contractId,
          adminId: seeds.adminId,
        }),
      ).toThrow(ConflictError);
    });

    it("throws ConflictError for an expired contract", () => {
      db.prepare(
        "UPDATE rental_contracts SET status = 'expired' WHERE id = ?",
      ).run(seeds.contractId);

      expect(() =>
        molecule.createCase({
          contractId: seeds.contractId,
          adminId: seeds.adminId,
        }),
      ).toThrow(ConflictError);
    });
  });

  // -------------------------------------------------------------------------
  // uploadOriginalDocument
  // -------------------------------------------------------------------------

  describe("uploadOriginalDocument", () => {
    it("uploads a valid PDF, creates version row with storage_status=ready and updates original_version_id", async () => {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });

      const pdfBytes = await makeMinimalPdf();

      const result = await molecule.uploadOriginalDocument({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "contrato.pdf",
        declaredMimeType: "application/pdf",
      });

      // Version row assertions
      expect(result.documentVersion.storage_status).toBe("ready");
      expect(result.documentVersion.kind).toBe("original");
      expect(result.documentVersion.version_number).toBe(1);
      expect(result.documentVersion.mime_type).toBe("application/pdf");
      expect(result.documentVersion.original_filename).toBe("contrato.pdf");
      expect(result.documentVersion.uploaded_by_type).toBe("admin");
      expect(result.documentVersion.uploaded_by_id).toBe(seeds.adminId);

      // Case now has original_version_id set
      expect(result.signatureCase.original_version_id).toBe(
        result.documentVersion.id,
      );

      // Version exists in DB
      const versionRow = db
        .prepare("SELECT * FROM contract_document_versions WHERE id = ?")
        .get(result.documentVersion.id);
      expect(versionRow).toBeDefined();
    });

    it("increments version_number on second upload", async () => {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });

      const pdfBytes = await makeMinimalPdf();

      const first = await molecule.uploadOriginalDocument({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "v1.pdf",
        declaredMimeType: "application/pdf",
      });
      expect(first.documentVersion.version_number).toBe(1);

      // Second upload (still in 'preparado' state, so allowed)
      const second = await molecule.uploadOriginalDocument({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "v2.pdf",
        declaredMimeType: "application/pdf",
      });
      expect(second.documentVersion.version_number).toBe(2);
    });

    it("throws PdfValidationError and creates no version row when bytes are not a PDF", async () => {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });

      const notPdf = Buffer.from("this is definitely not a pdf");

      await expect(
        molecule.uploadOriginalDocument({
          caseId: signatureCase.id,
          adminId: seeds.adminId,
          fileStream: Readable.from(notPdf),
          originalFilename: "bad.pdf",
          declaredMimeType: "application/pdf",
        }),
      ).rejects.toThrow(PdfValidationError);

      // No version row should have been created
      const versionCount = db
        .prepare(
          "SELECT COUNT(*) as cnt FROM contract_document_versions WHERE case_id = ?",
        )
        .get(signatureCase.id) as { cnt: number };
      expect(versionCount.cnt).toBe(0);
    });

    it("throws NotFoundError for a non-existent case", async () => {
      const pdfBytes = await makeMinimalPdf();
      await expect(
        molecule.uploadOriginalDocument({
          caseId: uuidv4(),
          adminId: seeds.adminId,
          fileStream: Readable.from(pdfBytes),
          originalFilename: "test.pdf",
          declaredMimeType: "application/pdf",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when case is in an incompatible state for upload", async () => {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });

      // Simulate a state that blocks uploads
      db.prepare(
        "UPDATE contract_signature_cases SET document_status = 'aprobado' WHERE id = ?",
      ).run(signatureCase.id);

      const pdfBytes = await makeMinimalPdf();
      await expect(
        molecule.uploadOriginalDocument({
          caseId: signatureCase.id,
          adminId: seeds.adminId,
          fileStream: Readable.from(pdfBytes),
          originalFilename: "test.pdf",
          declaredMimeType: "application/pdf",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("records original_uploaded and storage_finalized audit events on success", async () => {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });

      const pdfBytes = await makeMinimalPdf();

      await molecule.uploadOriginalDocument({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "contrato.pdf",
        declaredMimeType: "application/pdf",
      });

      const auditService = new ContractAuditService(db);
      const auditPage = auditService.listForCase(signatureCase.id);
      const eventTypes = auditPage.data.map((e) => e.event_type);

      expect(eventTypes).toContain("original_uploaded");
      expect(eventTypes).toContain("storage_finalized");
    });
  });

  describe("send and resend", () => {
    async function prepareCaseForDelivery() {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });
      const pdfBytes = await makeMinimalPdf();
      await molecule.uploadOriginalDocument({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "contrato.pdf",
        declaredMimeType: "application/pdf",
      });
      return molecule.getCaseById(signatureCase.id)!;
    }

    it("queues the original version with a seven-day link and pending attention", async () => {
      const signatureCase = await prepareCaseForDelivery();

      const result = molecule.send({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
      });

      expect(result.signatureCase.document_status).toBe("enviado");
      expect(result.signatureCase.formalization_status).toBe(
        "pendiente_formalizacion",
      );
      expect(result.signatureCase.delivery_attention).toBe("pending");
      expect(result.deliveryAttempt.attempt_number).toBe(1);
      expect(result.deliveryAttempt.delivery_status).toBe("queued");
      expect(result.deliveryAttempt.document_version_id).toBe(
        signatureCase.original_version_id,
      );
      expect(
        new Date(result.deliveryAttempt.expires_at).getTime() -
          new Date(result.deliveryAttempt.created_at).getTime(),
      ).toBe(7 * 24 * 60 * 60 * 1000);

      const outbox = db
        .prepare(
          "SELECT event_type, recipient_email, status, payload_ciphertext FROM contract_email_queue WHERE delivery_attempt_id = ?",
        )
        .get(result.deliveryAttempt.id) as {
        event_type: string;
        recipient_email: string;
        status: string;
        payload_ciphertext: string;
      };
      expect(outbox.event_type).toBe("contract_sent");
      expect(outbox.recipient_email).toBe("rider@test.com");
      expect(outbox.status).toBe("pending");
      expect(outbox.payload_ciphertext).not.toContain(
        result.deliveryAttempt.token_hash,
      );

      const tokenService = new TokenService(db, {
        outboxEncryptionKey: Buffer.alloc(32, 7),
      });
      const payload = tokenService.decryptOutboxPayload<{
        token: string;
        attemptId: string;
        documentVersionId: string;
        expiresAt: string;
      }>(outbox.payload_ciphertext);
      expect(tokenService.hash(payload.token)).toBe(
        result.deliveryAttempt.token_hash,
      );
      expect(payload.attemptId).toBe(result.deliveryAttempt.id);
      expect(payload.documentVersionId).toBe(signatureCase.original_version_id);
      expect(payload.expiresAt).toBe(result.deliveryAttempt.expires_at);
    });

    it("revokes the previous attempt and creates a new token after a delivery failure", async () => {
      const signatureCase = await prepareCaseForDelivery();
      const first = molecule.send({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
      });
      db.prepare(
        "UPDATE contract_delivery_attempts SET delivery_status = 'failed', last_error = 'smtp unavailable' WHERE id = ?",
      ).run(first.deliveryAttempt.id);
      db.prepare(
        "UPDATE contract_email_queue SET status = 'failed', last_error = 'smtp unavailable' WHERE delivery_attempt_id = ?",
      ).run(first.deliveryAttempt.id);

      const second = molecule.resend({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
      });

      expect(second.deliveryAttempt.attempt_number).toBe(2);
      expect(second.deliveryAttempt.token_hash).not.toBe(
        first.deliveryAttempt.token_hash,
      );
      expect(
        db
          .prepare(
            "SELECT revoked_at FROM contract_delivery_attempts WHERE id = ?",
          )
          .get(first.deliveryAttempt.id),
      ).toMatchObject({ revoked_at: expect.any(String) });
      expect(
        db
          .prepare(
            "SELECT revoked_at FROM contract_delivery_attempts WHERE id = ?",
          )
          .get(second.deliveryAttempt.id),
      ).toMatchObject({ revoked_at: null });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_delivery_attempts WHERE case_id = ?",
          )
          .get(signatureCase.id),
      ).toMatchObject({ count: 2 });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_email_queue WHERE case_id = ?",
          )
          .get(signatureCase.id),
      ).toMatchObject({ count: 2 });
      expect(molecule.getCaseById(signatureCase.id)?.delivery_attention).toBe(
        "pending",
      );
    });

    it("rejects sending without an original or from final/legacy terminal states", async () => {
      const testCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });
      expect(() =>
        molecule.send({ caseId: testCase.id, adminId: seeds.adminId }),
      ).toThrow(ConflictError);

      const pdfBytes = await makeMinimalPdf();
      await molecule.uploadOriginalDocument({
        caseId: testCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "contrato.pdf",
        declaredMimeType: "application/pdf",
      });

      db.prepare(
        "UPDATE contract_signature_cases SET document_status = 'aprobado' WHERE id = ?",
      ).run(testCase.id);
      expect(() =>
        molecule.resend({ caseId: testCase.id, adminId: seeds.adminId }),
      ).toThrow(ConflictError);

      db.prepare(
        "UPDATE contract_signature_cases SET document_status = 'enviado', formalization_status = 'cancelado' WHERE id = ?",
      ).run(testCase.id);
      expect(() =>
        molecule.resend({ caseId: testCase.id, adminId: seeds.adminId }),
      ).toThrow(ConflictError);

      db.prepare(
        "UPDATE contract_signature_cases SET formalization_status = 'pendiente_formalizacion' WHERE id = ?",
      ).run(testCase.id);
      db.prepare(
        "UPDATE rental_contracts SET status = 'renewed' WHERE id = ?",
      ).run(seeds.contractId);
      expect(() =>
        molecule.resend({ caseId: testCase.id, adminId: seeds.adminId }),
      ).toThrow(ConflictError);
    });

    it("rolls back revocation and preserves history when outbox insertion fails", async () => {
      const signatureCase = await prepareCaseForDelivery();
      const first = molecule.send({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
      });
      const failingEmailService: ContractEmailService = {
        queueContractEmail: () => {
          throw new Error("outbox unavailable");
        },
      };
      const failingMolecule = buildMolecule(db, storage, failingEmailService);

      expect(() =>
        failingMolecule.resend({
          caseId: signatureCase.id,
          adminId: seeds.adminId,
        }),
      ).toThrow("outbox unavailable");

      expect(
        db
          .prepare(
            "SELECT revoked_at FROM contract_delivery_attempts WHERE id = ?",
          )
          .get(first.deliveryAttempt.id),
      ).toMatchObject({ revoked_at: null });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_delivery_attempts WHERE case_id = ?",
          )
          .get(signatureCase.id),
      ).toMatchObject({ count: 1 });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_audit_events WHERE case_id = ? AND event_type = 'link_revoked'",
          )
          .get(signatureCase.id),
      ).toMatchObject({ count: 0 });
    });
  });

  describe("public contract link access and download", () => {
    async function preparePublicLink() {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });
      const pdfBytes = await makeMinimalPdf();
      const uploaded = await molecule.uploadOriginalDocument({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "contrato.pdf",
        declaredMimeType: "application/pdf",
      });
      const sent = molecule.send({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
      });
      const outbox = db
        .prepare(
          "SELECT payload_ciphertext FROM contract_email_queue WHERE delivery_attempt_id = ?",
        )
        .get(sent.deliveryAttempt.id) as { payload_ciphertext: string };
      const tokenService = new TokenService(db, {
        outboxEncryptionKey: Buffer.alloc(32, 7),
      });
      const payload = tokenService.decryptOutboxPayload<{ token: string }>(
        outbox.payload_ciphertext,
      );
      return {
        signatureCase: uploaded.signatureCase,
        sent,
        token: payload.token,
        pdfBytes,
      };
    }

    it("resolves the link, transitions only enviado, audits repeat access, and downloads the bound original", async () => {
      const { signatureCase, sent, token, pdfBytes } =
        await preparePublicLink();
      const app = express();
      app.use(
        "/public/contract-signatures",
        createContractSignaturePublicRoutes(molecule),
      );

      const firstResponse = await request(app).get(
        `/public/contract-signatures/${token}`,
      );
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.headers["referrer-policy"]).toBe("no-referrer");
      expect(firstResponse.headers["cache-control"]).toBe("no-store");
      expect(firstResponse.body).toMatchObject({
        status: 200,
        document_status: "accedido",
        expires_at: sent.deliveryAttempt.expires_at,
        can_download_original: true,
        can_upload_signed: true,
      });
      expect(firstResponse.body).not.toHaveProperty("case_id");
      expect(molecule.getCaseById(signatureCase.id)?.document_status).toBe(
        "accedido",
      );

      const second = molecule.getPublicContract(token);
      expect(second.kind).toBe("valid");
      if (second.kind === "valid") {
        expect(second.signatureCase.document_status).toBe("accedido");
      }

      const downloadResponse = await request(app).get(
        `/public/contract-signatures/${token}/original`,
      );
      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers["content-type"]).toMatch(
        /^application\/pdf/,
      );
      expect(downloadResponse.headers["content-disposition"]).toBe(
        'attachment; filename="contract-original.pdf"',
      );
      expect(downloadResponse.headers["cache-control"]).toBe("no-store");
      expect(Buffer.compare(downloadResponse.body, pdfBytes)).toBe(0);

      const auditRows = db
        .prepare(
          `SELECT event_type, result, document_version_id, delivery_attempt_id
             FROM contract_audit_events
            WHERE case_id = ?
              AND event_type IN ('link_access', 'document_download')`,
        )
        .all(signatureCase.id) as Array<{
        event_type: string;
        result: string;
        document_version_id: string | null;
        delivery_attempt_id: string | null;
      }>;
      expect(
        auditRows.filter((row) => row.event_type === "link_access").length,
      ).toBe(2);
      expect(
        auditRows.filter(
          (row) => row.event_type === "link_access" && row.result === "success",
        ),
      ).toHaveLength(2);
      expect(
        auditRows.filter(
          (row) =>
            row.event_type === "document_download" &&
            row.result === "success" &&
            row.document_version_id === signatureCase.original_version_id &&
            row.delivery_attempt_id === sent.deliveryAttempt.id,
        ),
      ).toHaveLength(1);
    });

    it("uses one generic response for invalid links and Rider mismatches", async () => {
      const { token } = await preparePublicLink();
      const invalid = molecule.getPublicContract(`${token}altered`);
      const mismatch = molecule.getPublicContract(token, uuidv4());

      expect(invalid).toEqual({ kind: "invalid" });
      expect(mismatch).toEqual({ kind: "invalid" });
    });

    it("blocks a download when the referenced storage object diverges", async () => {
      const { signatureCase, token } = await preparePublicLink();
      db.prepare(
        "UPDATE contract_document_versions SET sha256 = ? WHERE id = ?",
      ).run("0".repeat(64), signatureCase.original_version_id);

      const result = await molecule.downloadPublicOriginal(token);
      expect(result).toEqual({ kind: "invalid" });
      expect(
        db
          .prepare(
            `SELECT result, error_code FROM contract_audit_events
              WHERE case_id = ? AND event_type = 'document_download'
              ORDER BY occurred_at DESC, id DESC LIMIT 1`,
          )
          .get(signatureCase.id),
      ).toMatchObject({
        result: "failure",
        error_code: "document_unavailable",
      });
    });

    it("creates an immutable signed version and queues the Admin review notification", async () => {
      const { signatureCase, sent, token, pdfBytes } =
        await preparePublicLink();

      const result = await molecule.uploadSignedDocument({
        token,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "firmado.pdf",
        declaredMimeType: "application/pdf",
      });

      expect(result.kind).toBe("valid");
      if (result.kind !== "valid") return;
      expect(result.documentVersion.kind).toBe("signed");
      expect(result.documentVersion.version_number).toBe(2);
      expect(result.documentVersion.uploaded_by_type).toBe("rider");
      expect(result.documentVersion.uploaded_by_id).toBeNull();
      expect(result.signatureCase.current_signed_version_id).toBe(
        result.documentVersion.id,
      );
      expect(result.signatureCase.document_status).toBe("cargado");
      expect(result.signatureCase.formalization_status).toBe(
        "pendiente_formalizacion",
      );

      const versions = db
        .prepare(
          "SELECT kind, storage_key, sha256 FROM contract_document_versions WHERE case_id = ? ORDER BY version_number",
        )
        .all(signatureCase.id) as Array<{
        kind: string;
        storage_key: string;
        sha256: string;
      }>;
      expect(versions).toHaveLength(2);
      expect(versions[0].kind).toBe("original");
      expect(versions[1].kind).toBe("signed");
      expect(versions[0].storage_key).not.toBe(versions[1].storage_key);
      expect(versions[0].sha256).toBe(versions[1].sha256);

      const queue = db
        .prepare(
          `SELECT event_type, recipient_email, status, payload_ciphertext
             FROM contract_email_queue
            WHERE case_id = ? AND event_type = 'signed_document_available'`,
        )
        .get(signatureCase.id) as {
        event_type: string;
        recipient_email: string;
        status: string;
        payload_ciphertext: string;
      };
      expect(queue).toMatchObject({
        event_type: "signed_document_available",
        recipient_email: "admin@test.com",
        status: "pending",
      });
      expect(queue.payload_ciphertext).not.toContain(token);
      expect(queue.payload_ciphertext).not.toContain(
        pdfBytes.toString("base64"),
      );

      const auditEventTypes = new ContractAuditService(db)
        .listForCase(signatureCase.id)
        .data.map((event) => event.event_type);
      expect(auditEventTypes).toContain("signed_uploaded");
      expect(auditEventTypes).toContain("storage_finalized");
      expect(sent.deliveryAttempt.id).toBeTruthy();
    });

    it("rejects an invalid signed PDF without creating a version or changing the original", async () => {
      const { signatureCase, token } = await preparePublicLink();
      const originalVersionId = signatureCase.original_version_id;
      const invalidPdf = Buffer.from("not a PDF");

      await expect(
        molecule.uploadSignedDocument({
          token,
          fileStream: Readable.from(invalidPdf),
          originalFilename: "firmado.pdf",
          declaredMimeType: "application/pdf",
        }),
      ).rejects.toThrow(PdfValidationError);

      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_document_versions WHERE case_id = ?",
          )
          .get(signatureCase.id),
      ).toMatchObject({ count: 1 });
      expect(molecule.getCaseById(signatureCase.id)).toMatchObject({
        original_version_id: originalVersionId,
        current_signed_version_id: null,
        document_status: "enviado",
        formalization_status: "pendiente_formalizacion",
      });
      expect(
        db
          .prepare(
            `SELECT result, error_code FROM contract_audit_events
              WHERE case_id = ? AND event_type = 'signed_upload_attempt'
              ORDER BY occurred_at DESC, id DESC LIMIT 1`,
          )
          .get(signatureCase.id),
      ).toMatchObject({ result: "failure", error_code: "pdf_unreadable" });
    });

    it("accepts the signed PDF through the public multipart route without exposing identifiers", async () => {
      const { signatureCase, token, pdfBytes } = await preparePublicLink();
      const app = express();
      app.use(
        "/public/contract-signatures",
        createContractSignaturePublicRoutes(molecule),
      );

      const response = await request(app)
        .post(`/public/contract-signatures/${token}/signed`)
        .attach("document", pdfBytes, {
          filename: "firmado.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(201);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["referrer-policy"]).toBe("no-referrer");
      expect(response.body).toEqual({
        status: 201,
        uploaded: true,
        document_status: "cargado",
      });
      expect(response.text).not.toContain(token);
      expect(response.text).not.toContain(signatureCase.id);
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_document_versions WHERE case_id = ? AND kind = 'signed'",
          )
          .get(signatureCase.id),
      ).toMatchObject({ count: 1 });
    });
  });

  describe("review, manual verification, approval and rejection", () => {
    async function prepareCaseForReview(signedVersionCount = 1) {
      const signatureCase = molecule.createCase({
        contractId: seeds.contractId,
        adminId: seeds.adminId,
      });
      const pdfBytes = await makeMinimalPdf();
      await molecule.uploadOriginalDocument({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
        fileStream: Readable.from(pdfBytes),
        originalFilename: "contrato.pdf",
        declaredMimeType: "application/pdf",
      });
      const sent = molecule.send({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
      });
      const outbox = db
        .prepare(
          "SELECT payload_ciphertext FROM contract_email_queue WHERE delivery_attempt_id = ?",
        )
        .get(sent.deliveryAttempt.id) as { payload_ciphertext: string };
      const tokenService = new TokenService(db, {
        outboxEncryptionKey: Buffer.alloc(32, 7),
      });
      const payload = tokenService.decryptOutboxPayload<{ token: string }>(
        outbox.payload_ciphertext,
      );
      let signedVersion: ContractDocumentVersion | null = null;
      for (let index = 0; index < signedVersionCount; index += 1) {
        const uploaded = await molecule.uploadSignedDocument({
          token: payload.token,
          fileStream: Readable.from(pdfBytes),
          originalFilename: `firmado-${index + 1}.pdf`,
          declaredMimeType: "application/pdf",
        });
        expect(uploaded.kind).toBe("valid");
        if (uploaded.kind !== "valid") throw new Error("Signed upload failed");
        signedVersion = uploaded.documentVersion;
      }
      const review = molecule.startReview({
        caseId: signatureCase.id,
        adminId: seeds.adminId,
      });
      return {
        signatureCase: review.signatureCase,
        signedVersion: signedVersion!,
        originalVersionId: signatureCase.original_version_id!,
      };
    }

    it("approves the exact current signed version after its latest satisfactory verification", async () => {
      const prepared = await prepareCaseForReview();
      molecule.verify({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        versionId: prepared.signedVersion.id,
        result: "satisfactory",
        comments: "All required contractual fields were checked.",
      });

      const result = await molecule.approve({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        versionId: prepared.signedVersion.id,
      });

      expect(result.signatureCase.document_status).toBe("aprobado");
      expect(result.signatureCase.formalization_status).toBe("activo");
      expect(result.signatureCase.formalized_at).toBe(result.formalizedAt);
      expect(
        db
          .prepare(
            "SELECT event_type, recipient_email FROM contract_email_queue WHERE case_id = ? AND event_type = 'contract_approved'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({
        event_type: "contract_approved",
        recipient_email: "rider@test.com",
      });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_audit_events WHERE case_id = ? AND event_type = 'approved' AND result = 'success'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({ count: 1 });
    });

    it("never approves from a satisfactory verification belonging to an older signed version", async () => {
      const prepared = await prepareCaseForReview(2);
      const versions = db
        .prepare(
          "SELECT id FROM contract_document_versions WHERE case_id = ? AND kind = 'signed' ORDER BY version_number",
        )
        .all(prepared.signatureCase.id) as Array<{ id: string }>;
      molecule.verify({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        versionId: versions[0].id,
        result: "satisfactory",
      });

      await expect(
        molecule.approve({
          caseId: prepared.signatureCase.id,
          adminId: seeds.adminId,
          versionId: versions[1].id,
        }),
      ).rejects.toThrow(ConflictError);
      expect(molecule.getCaseById(prepared.signatureCase.id)).toMatchObject({
        document_status: "en_revision",
        formalization_status: "pendiente_formalizacion",
        formalized_at: null,
      });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_email_queue WHERE case_id = ? AND event_type = 'contract_approved'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({ count: 0 });
    });

    it("rejects approval when the latest verification of the current version is unsatisfactory", async () => {
      const prepared = await prepareCaseForReview();
      const first = molecule.verify({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        versionId: prepared.signedVersion.id,
        result: "satisfactory",
      });
      const second = molecule.verify({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        versionId: prepared.signedVersion.id,
        result: "unsatisfactory",
        comments: "The rider signature page is incomplete.",
      });
      db.prepare(
        "UPDATE contract_verifications SET created_at = ? WHERE id = ?",
      ).run("2025-02-28T23:31:00.000Z", first.verification.id);
      db.prepare(
        "UPDATE contract_verifications SET created_at = ? WHERE id = ?",
      ).run("2025-02-28T23:32:00.000Z", second.verification.id);

      await expect(
        molecule.approve({
          caseId: prepared.signatureCase.id,
          adminId: seeds.adminId,
          versionId: prepared.signedVersion.id,
        }),
      ).rejects.toThrow(ConflictError);
      expect(
        molecule.getCaseById(prepared.signatureCase.id)?.document_status,
      ).toBe("en_revision");
    });

    it("rejects approval for an invalid state, mismatched version, or missing PDF object", async () => {
      const prepared = await prepareCaseForReview();
      await expect(
        molecule.approve({
          caseId: prepared.signatureCase.id,
          adminId: seeds.adminId,
          versionId: prepared.originalVersionId,
        }),
      ).rejects.toThrow(ConflictError);
      db.prepare(
        "UPDATE contract_signature_cases SET document_status = 'cargado' WHERE id = ?",
      ).run(prepared.signatureCase.id);
      await expect(
        molecule.approve({
          caseId: prepared.signatureCase.id,
          adminId: seeds.adminId,
          versionId: prepared.signedVersion.id,
        }),
      ).rejects.toThrow(ConflictError);

      db.prepare(
        "UPDATE contract_signature_cases SET document_status = 'en_revision' WHERE id = ?",
      ).run(prepared.signatureCase.id);
      molecule.verify({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        versionId: prepared.signedVersion.id,
        result: "satisfactory",
      });
      await storage.quarantine(prepared.signedVersion.storage_key);
      await expect(
        molecule.approve({
          caseId: prepared.signatureCase.id,
          adminId: seeds.adminId,
          versionId: prepared.signedVersion.id,
        }),
      ).rejects.toThrow(ConflictError);
      expect(molecule.getCaseById(prepared.signatureCase.id)).toMatchObject({
        document_status: "en_revision",
        formalization_status: "pendiente_formalizacion",
        formalized_at: null,
      });
    });

    it("rolls back approval state, formalization, success audit and outbox when notification enqueue fails", async () => {
      const prepared = await prepareCaseForReview();
      molecule.verify({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        versionId: prepared.signedVersion.id,
        result: "satisfactory",
      });
      const failingEmailService: ContractEmailService = {
        queueContractEmail: () => {
          throw new Error("outbox unavailable");
        },
      };
      const failingMolecule = buildMolecule(db, storage, failingEmailService);

      await expect(
        failingMolecule.approve({
          caseId: prepared.signatureCase.id,
          adminId: seeds.adminId,
          versionId: prepared.signedVersion.id,
        }),
      ).rejects.toThrow("outbox unavailable");
      expect(molecule.getCaseById(prepared.signatureCase.id)).toMatchObject({
        document_status: "en_revision",
        formalization_status: "pendiente_formalizacion",
        formalized_at: null,
      });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_email_queue WHERE case_id = ? AND event_type = 'contract_approved'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({ count: 0 });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_audit_events WHERE case_id = ? AND event_type = 'approved'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({ count: 0 });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_audit_events WHERE case_id = ? AND event_type = 'transition_failed'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({ count: 1 });
    });

    it("accepts a rejection reason at the inclusive minimum of 10 characters", async () => {
      const prepared = await prepareCaseForReview();
      const result = molecule.reject({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        reason: "1234567890",
      });
      expect(result.signatureCase.document_status).toBe("rechazado");
      expect(result.reason).toHaveLength(10);
    });

    it("accepts a rejection reason at the inclusive maximum of 500 characters", async () => {
      const prepared = await prepareCaseForReview();
      const result = molecule.reject({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        reason: "x".repeat(500),
      });
      expect(result.reason).toHaveLength(500);
      expect(result.signatureCase.formalization_status).toBe(
        "pendiente_formalizacion",
      );
    });

    it("rejects an out-of-range rejection reason without mutating state or outbox", async () => {
      const prepared = await prepareCaseForReview();
      expect(() =>
        molecule.reject({
          caseId: prepared.signatureCase.id,
          adminId: seeds.adminId,
          reason: "x".repeat(501),
        }),
      ).toThrow(ValidationError);
      expect(molecule.getCaseById(prepared.signatureCase.id)).toMatchObject({
        document_status: "en_revision",
        formalization_status: "pendiente_formalizacion",
      });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM contract_email_queue WHERE case_id = ? AND event_type = 'contract_rejected'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({ count: 0 });
    });

    it("preserves every version, keeps formalization pending, and permits a later resend after rejection", async () => {
      const prepared = await prepareCaseForReview(2);
      const versionCountBefore = db
        .prepare(
          "SELECT COUNT(*) AS count FROM contract_document_versions WHERE case_id = ?",
        )
        .get(prepared.signatureCase.id) as { count: number };
      const result = molecule.reject({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
        reason: "The signed date does not match the contract date.",
      });
      const versionCountAfter = db
        .prepare(
          "SELECT COUNT(*) AS count FROM contract_document_versions WHERE case_id = ?",
        )
        .get(prepared.signatureCase.id) as { count: number };

      expect(versionCountAfter.count).toBe(versionCountBefore.count);
      expect(result.signatureCase.formalization_status).toBe(
        "pendiente_formalizacion",
      );
      expect(result.signatureCase.document_status).toBe("rechazado");
      expect(
        db
          .prepare(
            "SELECT event_type, metadata_json FROM contract_audit_events WHERE case_id = ? AND event_type = 'rejected'",
          )
          .get(prepared.signatureCase.id),
      ).toMatchObject({ event_type: "rejected" });

      const resent = molecule.resend({
        caseId: prepared.signatureCase.id,
        adminId: seeds.adminId,
      });
      expect(resent.deliveryAttempt.attempt_number).toBe(2);
      expect(resent.signatureCase.document_status).toBe("enviado");
      expect(resent.signatureCase.formalization_status).toBe(
        "pendiente_formalizacion",
      );
    });
  });
});
