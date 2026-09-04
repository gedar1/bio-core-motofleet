import { beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import path from "node:path";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

import { runMigrations } from "../../src/infrastructure/database.js";
import {
  ContractEmailProcessingError,
  ContractEmailService,
} from "../../src/infrastructure/ContractEmailService.js";
import { TokenService } from "../../src/infrastructure/TokenService.js";
import type { ILogger } from "../../src/infrastructure/logger.js";
import type { ContractEmailQueueInput } from "../../src/molecules/ContractSignatureMolecule.js";
import type { ContractEmailEventType } from "../../src/domains/contractSignature.js";

const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => noopLogger,
};

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db, path.resolve("src/migrations"));

  const adminId = uuidv4();
  const riderId = uuidv4();
  const motorcycleId = uuidv4();
  const contractId = uuidv4();
  // These IDs are deliberately stable fixture values so the payload examples
  // remain readable; they are seeded as real related rows below.
  const caseId = "case-1";
  const documentVersionId = "version-1";
  const deliveryAttemptId = "attempt-1";
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.parse(now) + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  db.prepare(
    `INSERT INTO admins (id, name, email, password_hash, role, status)
     VALUES (?, 'Admin', 'admin@example.com', 'hash', 'operator', 'active')`,
  ).run(adminId);
  db.prepare(
    `INSERT INTO riders
       (id, name, phone, email, address, password_hash, license_number,
        license_expiry, insurance_number, insurance_expiry, bond_amount,
        emergency_contact_name, emergency_contact_phone, status, available)
     VALUES (?, 'Rider', '3000000000', 'rider@example.com', 'Address', 'hash',
        'LIC-1', '2030-01-01', 'INS-1', '2030-01-01', 1,
        'Emergency', '3000000001', 'active', 0)`,
  ).run(riderId);
  db.prepare(
    `INSERT INTO motorcycles
       (id, plate, brand, model, year, color, engine_cc, soat_expiry,
        inspection_expiry, status)
     VALUES (?, 'ABC123', 'Honda', 'CB', 2024, 'black', 190,
        '2030-01-01', '2030-01-01', 'rented')`,
  ).run(motorcycleId);
  db.prepare(
    `INSERT INTO rental_contracts
       (id, rider_id, motorcycle_id, start_date, end_date, monthly_amount,
        payment_day, status, created_at, updated_at)
     VALUES (?, ?, ?, '2025-01-01', '2026-01-01', 100, 1, 'active', ?, ?)`,
  ).run(contractId, riderId, motorcycleId, now, now);
  db.prepare(
    `INSERT INTO contract_signature_cases
       (id, contract_id, rider_id, motorcycle_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(caseId, contractId, riderId, motorcycleId, adminId, now, now);
  db.prepare(
    `INSERT INTO contract_document_versions
       (id, case_id, version_number, kind, storage_key, storage_status,
        original_filename, mime_type, size_bytes, sha256,
        uploaded_by_type, uploaded_by_id, created_at, uploaded_at, updated_at)
     VALUES (?, ?, 1, 'original', 'fixture-original', 'ready',
        'contract.pdf', 'application/pdf', 1, ?, 'admin', ?, ?, ?, ?)`,
  ).run(documentVersionId, caseId, "a".repeat(64), adminId, now, now, now);
  db.prepare(
    "UPDATE contract_signature_cases SET original_version_id = ? WHERE id = ?",
  ).run(documentVersionId, caseId);
  db.prepare(
    `INSERT INTO contract_delivery_attempts
       (id, case_id, document_version_id, attempt_number, token_hash,
        created_at, expires_at, delivery_status, created_by)
     VALUES (?, ?, ?, 1, ?, ?, ?, 'queued', ?)`,
  ).run(
    deliveryAttemptId,
    caseId,
    documentVersionId,
    "b".repeat(64),
    now,
    expiresAt,
    adminId,
  );

  return db;
}

function buildTokenService(db: Database.Database): TokenService {
  return new TokenService(db, { outboxEncryptionKey: Buffer.alloc(32, 9) });
}

function fakeTransporter() {
  const sendMail = vi.fn(async () => ({ messageId: "test-message" }));
  return {
    sendMail,
  } as unknown as nodemailer.Transporter & { sendMail: typeof sendMail };
}

function inputFor(
  eventType: ContractEmailEventType,
  payload: Record<string, unknown>,
  tokenService: TokenService,
): ContractEmailQueueInput {
  return {
    id: uuidv4(),
    caseId: "case-1",
    deliveryAttemptId:
      eventType === "contract_approved" || eventType === "contract_rejected"
        ? null
        : "attempt-1",
    eventType,
    recipientEmail:
      eventType === "signed_document_available"
        ? "admin@example.com"
        : "rider@example.com",
    subject: "caller-controlled value is replaced by the canonical subject",
    templateKey: "caller-controlled-template",
    payloadCiphertext: tokenService.encryptOutboxPayload({
      eventType,
      ...payload,
    }),
    createdAt: new Date().toISOString(),
  };
}

describe("ContractEmailService", () => {
  let db: Database.Database;
  let tokenService: TokenService;

  beforeEach(() => {
    db = createDb();
    tokenService = buildTokenService(db);
  });

  it("renders all six events with the correct recipient, canonical subject, and required content", () => {
    const transporter = fakeTransporter();
    const service = new ContractEmailService(db, tokenService, noopLogger, {
      transporter,
      env: {
        SMTP_HOST: "smtp.example.test",
        SMTP_FROM: "noreply@example.test",
      },
    });
    const token = "raw-link-token-that-must-stay-encrypted";
    const common = {
      caseId: "case-1",
      contractId: "contract-1",
      riderId: "rider-1",
      link: `https://example.test/public/${token}`,
      expiresAt: "2025-03-07T23:30:00.000Z",
    };
    const cases: Array<{
      eventType: ContractEmailEventType;
      payload: Record<string, unknown>;
      required: string[];
    }> = [
      {
        eventType: "contract_sent",
        payload: common,
        required: [
          "contract-1",
          token,
          common.expiresAt,
          "Download",
          "externally",
          "Upload",
        ],
      },
      {
        eventType: "contract_resent",
        payload: common,
        required: ["contract-1", token, "previous access link", "Upload"],
      },
      {
        eventType: "signed_document_available",
        payload: {
          caseId: common.caseId,
          contractId: common.contractId,
          riderId: common.riderId,
          adminLink: "/admin/contracts/case-1/review",
        },
        required: ["rider-1", "contract-1", "administrative review"],
      },
      {
        eventType: "contract_approved",
        payload: {
          contractId: common.contractId,
          documentStatus: "aprobado",
          formalizationStatus: "activo",
          formalizedAt: common.expiresAt,
        },
        required: ["contract-1", "aprobado", "activo", common.expiresAt],
      },
      {
        eventType: "contract_rejected",
        payload: {
          contractId: common.contractId,
          documentStatus: "rechazado",
          formalizationStatus: "pendiente_formalizacion",
          reason: "The signature is missing on page two.",
          correctiveAction: "Upload a corrected signed PDF.",
        },
        required: [
          "contract-1",
          "rechazado",
          "pendiente_formalizacion",
          "missing on page two",
          "corrected signed PDF",
        ],
      },
      {
        eventType: "link_expired",
        payload: {
          caseId: common.caseId,
          contractId: common.contractId,
          expiresAt: common.expiresAt,
          link: common.link,
        },
        required: ["case-1", "contract-1", "expired", "resend"],
      },
    ];

    for (const testCase of cases) {
      const input = inputFor(
        testCase.eventType,
        testCase.payload,
        tokenService,
      );
      const rendered = service.renderQueuedEmail(input);
      expect(rendered.to).toBe(
        testCase.eventType === "signed_document_available"
          ? "admin@example.com"
          : "rider@example.com",
      );
      expect(rendered.subject).toBe(service.subjectFor(testCase.eventType));
      for (const required of testCase.required) {
        expect(`${rendered.html}\n${rendered.text}`).toContain(required);
      }
    }
  });

  it("escapes HTML values and rejects unsafe link schemes", () => {
    const service = new ContractEmailService(db, tokenService, noopLogger, {
      env: {
        SMTP_HOST: "smtp.example.test",
        SMTP_FROM: "noreply@example.test",
      },
    });
    const payload = {
      eventType: "contract_rejected" as const,
      contractId: `<script>alert("x")</script>&'`,
      documentStatus: `rejected <img src=x onerror=alert(1)>`,
      formalizationStatus: "pendiente_formalizacion",
      reason: `reason <script>alert('x')</script> & more`,
      correctiveAction: 'Upload <a href="evil">again</a>',
    };
    const rendered = service.renderQueuedEmail(
      inputFor("contract_rejected", payload, tokenService),
    );

    expect(rendered.html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;",
    );
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain("<img");
    expect(rendered.html).not.toContain('<a href="evil"');
    expect(() =>
      service.renderQueuedEmail(
        inputFor(
          "contract_sent",
          {
            contractId: "contract-1",
            link: "javascript:alert(1)",
            expiresAt: "tomorrow",
          },
          tokenService,
        ),
      ),
    ).toThrow(ContractEmailProcessingError);
  });

  it("persists the token and dynamic link only inside the authenticated ciphertext", () => {
    const transporter = fakeTransporter();
    const service = new ContractEmailService(db, tokenService, noopLogger, {
      transporter,
      emailNotificationsEnabled: false,
      env: {
        SMTP_HOST: "smtp.example.test",
        SMTP_FROM: "noreply@example.test",
      },
    });
    const token = "plain-token-never-in-sql-columns";
    const link = `https://example.test/access/${token}`;
    const input = inputFor(
      "contract_sent",
      {
        contractId: "contract-1",
        link,
        expiresAt: "2025-03-07T23:30:00.000Z",
      },
      tokenService,
    );

    service.queueContractEmail(input);
    const row = db
      .prepare(
        "SELECT recipient_email, subject, template_key, payload_ciphertext FROM contract_email_queue WHERE id = ?",
      )
      .get(input.id) as Record<string, string>;
    const visibleColumns = Object.values(row).join(" ");

    expect(visibleColumns).not.toContain(token);
    expect(visibleColumns).not.toContain(link);
    expect(row.payload_ciphertext).not.toContain(token);
    expect(row.payload_ciphertext).not.toContain("<html");
    expect(row.subject).toBe(service.subjectFor("contract_sent"));
    expect(
      transporter.sendMail as unknown as ReturnType<typeof vi.fn>,
    ).not.toHaveBeenCalled();
  });

  it("keeps outbox insertion in the caller transaction and never sends SMTP while queuing", () => {
    const transporter = fakeTransporter();
    const service = new ContractEmailService(db, tokenService, noopLogger, {
      transporter,
      env: {
        SMTP_HOST: "smtp.example.test",
        SMTP_FROM: "noreply@example.test",
      },
    });
    const input = inputFor(
      "signed_document_available",
      {
        caseId: "case-1",
        contractId: "contract-1",
        riderId: "rider-1",
      },
      tokenService,
    );

    expect(() => {
      db.transaction(() => {
        service.queueContractEmail(input);
        throw new Error("rollback domain transaction");
      })();
    }).toThrow("rollback domain transaction");
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM contract_email_queue").get(),
    ).toMatchObject({ count: 0 });
    expect(
      transporter.sendMail as unknown as ReturnType<typeof vi.fn>,
    ).not.toHaveBeenCalled();
  });

  it("fails generically for an unavailable key or manipulated authenticated payload", () => {
    const service = new ContractEmailService(db, tokenService, noopLogger, {
      env: {
        SMTP_HOST: "smtp.example.test",
        SMTP_FROM: "noreply@example.test",
      },
    });
    const input = inputFor(
      "contract_sent",
      {
        contractId: "contract-1",
        link: "https://example.test/access/token",
        expiresAt: "2025-03-07T23:30:00.000Z",
      },
      tokenService,
    );
    const manipulated = {
      ...input,
      payloadCiphertext: `${input.payloadCiphertext.slice(0, -1)}x`,
    };

    expect(() => service.renderQueuedEmail(manipulated)).toThrow(
      ContractEmailProcessingError,
    );
    expect(() => service.renderQueuedEmail(manipulated)).toThrow(
      "Contract email could not be processed safely.",
    );
    expect(() =>
      new ContractEmailService(db, new TokenService(db), noopLogger, {
        env: {
          SMTP_HOST: "smtp.example.test",
          SMTP_FROM: "noreply@example.test",
        },
      }).queueContractEmail({
        ...input,
        payloadCiphertext: "v1.a.b.c",
      }),
    ).toThrow(ContractEmailProcessingError);
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM contract_email_queue").get(),
    ).toMatchObject({ count: 0 });
  });

  it("honors EMAIL_NOTIFICATIONS_ENABLED without disabling durable outbox insertion", async () => {
    const transporter = fakeTransporter();
    const disabled = new ContractEmailService(db, tokenService, noopLogger, {
      transporter,
      emailNotificationsEnabled: false,
      env: {
        SMTP_HOST: "smtp.example.test",
        SMTP_FROM: "noreply@example.test",
      },
    });
    const input = inputFor(
      "contract_approved",
      {
        contractId: "contract-1",
        documentStatus: "aprobado",
        formalizationStatus: "activo",
        formalizedAt: "2025-03-01T00:00:00.000Z",
      },
      tokenService,
    );

    disabled.queueContractEmail(input);
    await expect(disabled.sendQueuedEmail(input)).resolves.toEqual({
      sent: false,
      skipped: true,
    });
    expect(
      transporter.sendMail as unknown as ReturnType<typeof vi.fn>,
    ).not.toHaveBeenCalled();

    const enabledTransporter = fakeTransporter();
    const enabled = new ContractEmailService(db, tokenService, noopLogger, {
      transporter: enabledTransporter,
      emailNotificationsEnabled: true,
      env: {
        SMTP_HOST: "smtp.example.test",
        SMTP_FROM: "noreply@example.test",
      },
    });
    await expect(enabled.sendQueuedEmail(input)).resolves.toEqual({
      sent: true,
      skipped: false,
    });
    expect(
      enabledTransporter.sendMail as unknown as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledTimes(1);
  });
});
