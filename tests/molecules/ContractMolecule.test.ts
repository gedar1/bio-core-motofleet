import path from "node:path";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

import { runMigrations } from "../../src/infrastructure/database.js";
import { ContractMolecule } from "../../src/molecules/ContractMolecule.js";
import type { ILogger } from "../../src/infrastructure/logger.js";

const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => noopLogger,
};

interface SeedIds {
  adminId: string;
  riderId: string;
  motorcycleId: string;
  contractId: string;
  caseId?: string;
}

interface SignatureHistorySnapshot {
  signatureCase: Record<string, unknown>;
  versions: Array<Record<string, unknown>>;
  attempts: Array<Record<string, unknown>>;
  auditEvents: Array<Record<string, unknown>>;
}

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db, path.resolve("src/migrations"));
  return db;
}

function seedContract(
  db: Database.Database,
  options: { endDate?: string; motorcycleStatus?: "available" | "rented" } = {},
): SeedIds {
  const adminId = uuidv4();
  const riderId = uuidv4();
  const motorcycleId = uuidv4();
  const contractId = uuidv4();
  const cosignerId = uuidv4();
  const now = new Date().toISOString();
  const motorcycleStatus = options.motorcycleStatus ?? "rented";

  db.prepare(
    `INSERT INTO admins (id, name, email, password_hash, role, status)
     VALUES (?, 'Test Admin', ?, 'hash', 'operator', 'active')`,
  ).run(adminId, `${adminId}@test.example`);
  db.prepare(
    `INSERT INTO riders
       (id, name, phone, email, address, password_hash,
        license_number, license_expiry, insurance_number, insurance_expiry,
        bond_amount, emergency_contact_name, emergency_contact_phone, status, available)
     VALUES (?, 'Test Rider', '3001234567', ?, 'Calle 1', 'hash',
             'LIC-001', '2030-01-01', 'INS-001', '2030-01-01',
             1000000, 'Emergency', '3009876543', 'active', 0)`,
  ).run(riderId, `${riderId}@test.example`);
  db.prepare(
    `INSERT INTO motorcycles
       (id, plate, brand, model, year, color, engine_cc,
        soat_expiry, inspection_expiry, status)
     VALUES (?, ?, 'Honda', 'CB190R', 2022, 'Rojo', 190,
             '2030-01-01', '2030-01-01', ?)`,
  ).run(motorcycleId, `PLT-${motorcycleId.slice(0, 6)}`, motorcycleStatus);
  db.prepare(
    `INSERT INTO cosigners
       (id, rider_id, name, address, phone, relationship, identity_document)
     VALUES (?, ?, 'Cosigner Test', 'Calle 2', '3002222222', 'friend', 'CC-111')`,
  ).run(cosignerId, riderId);
  db.prepare(
    `INSERT INTO rental_contracts
       (id, rider_id, motorcycle_id, start_date, end_date,
        monthly_amount, payment_day, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, '2024-01-01', ?, 500000, 5, 'active', NULL, ?, ?)`,
  ).run(
    contractId,
    riderId,
    motorcycleId,
    options.endDate ?? "2099-01-01",
    now,
    now,
  );

  return { adminId, riderId, motorcycleId, contractId };
}

function attachDocumentaryHistory(
  db: Database.Database,
  seed: SeedIds,
): SeedIds & { caseId: string } {
  const caseId = uuidv4();
  const originalVersionId = uuidv4();
  const signedVersionId = uuidv4();
  const attemptId = uuidv4();
  const auditId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO contract_signature_cases
       (id, contract_id, rider_id, motorcycle_id, document_status,
        formalization_status, delivery_attention, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'en_revision', 'pendiente_formalizacion', 'sent', ?, ?, ?)`,
  ).run(
    caseId,
    seed.contractId,
    seed.riderId,
    seed.motorcycleId,
    seed.adminId,
    now,
    now,
  );
  db.prepare(
    `INSERT INTO contract_document_versions
       (id, case_id, version_number, kind, storage_key, storage_status,
        original_filename, mime_type, size_bytes, sha256, uploaded_by_type,
        uploaded_by_id, created_at, uploaded_at, updated_at)
     VALUES (?, ?, 1, 'original', ?, 'ready', 'original.pdf',
             'application/pdf', 128, ?, 'admin', ?, ?, ?, ?)`,
  ).run(
    originalVersionId,
    caseId,
    `doc_${"1".repeat(64)}`,
    "a".repeat(64),
    seed.adminId,
    now,
    now,
    now,
  );
  db.prepare(
    `INSERT INTO contract_document_versions
       (id, case_id, version_number, kind, storage_key, storage_status,
        original_filename, mime_type, size_bytes, sha256, uploaded_by_type,
        uploaded_by_id, created_at, uploaded_at, updated_at)
     VALUES (?, ?, 2, 'signed', ?, 'ready', 'signed.pdf',
             'application/pdf', 256, ?, 'rider', ?, ?, ?, ?)`,
  ).run(
    signedVersionId,
    caseId,
    `doc_${"2".repeat(64)}`,
    "b".repeat(64),
    seed.riderId,
    now,
    now,
    now,
  );
  db.prepare(
    `UPDATE contract_signature_cases
        SET original_version_id = ?, current_signed_version_id = ?,
            reviewed_version_id = ?
      WHERE id = ?`,
  ).run(originalVersionId, signedVersionId, signedVersionId, caseId);
  db.prepare(
    `INSERT INTO contract_delivery_attempts
       (id, case_id, document_version_id, attempt_number, token_hash,
        created_at, expires_at, delivery_status, created_by)
     VALUES (?, ?, ?, 1, ?, ?, '2099-01-08T00:00:00.000Z', 'sent', ?)`,
  ).run(
    attemptId,
    caseId,
    originalVersionId,
    "c".repeat(64),
    now,
    seed.adminId,
  );
  db.prepare(
    `INSERT INTO contract_audit_events
       (id, case_id, event_type, occurred_at, result, actor_type, actor_id,
        document_version_id, delivery_attempt_id, metadata_json)
     VALUES (?, ?, 'case_created', ?, 'success', 'admin', ?, ?, ?, '{}')`,
  ).run(auditId, caseId, now, seed.adminId, originalVersionId, attemptId);

  return { ...seed, caseId };
}

function snapshotSignatureHistory(
  db: Database.Database,
  caseId: string,
): SignatureHistorySnapshot {
  return {
    signatureCase: db
      .prepare("SELECT * FROM contract_signature_cases WHERE id = ?")
      .get(caseId) as Record<string, unknown>,
    versions: db
      .prepare(
        "SELECT * FROM contract_document_versions WHERE case_id = ? ORDER BY version_number",
      )
      .all(caseId) as Array<Record<string, unknown>>,
    attempts: db
      .prepare(
        "SELECT * FROM contract_delivery_attempts WHERE case_id = ? ORDER BY attempt_number",
      )
      .all(caseId) as Array<Record<string, unknown>>,
    auditEvents: db
      .prepare(
        "SELECT * FROM contract_audit_events WHERE case_id = ? ORDER BY occurred_at, id",
      )
      .all(caseId) as Array<Record<string, unknown>>,
  };
}

function expectDocumentaryHistoryUnchanged(
  before: SignatureHistorySnapshot,
  after: SignatureHistorySnapshot,
): void {
  expect(after).toEqual(before);
}

describe("ContractMolecule legacy compatibility", () => {
  let db: Database.Database;
  let molecule: ContractMolecule;

  beforeEach(() => {
    db = createTestDb();
    molecule = new ContractMolecule(db, noopLogger);
  });

  it("creates a legacy contract with status active and no documentary backfill", () => {
    const seed = seedContract(db, { motorcycleStatus: "available" });
    db.prepare("DELETE FROM rental_contracts WHERE id = ?").run(
      seed.contractId,
    );

    const created = molecule.create({
      rider_id: seed.riderId,
      motorcycle_id: seed.motorcycleId,
      start_date: "2025-01-01",
      end_date: "2026-01-01",
      monthly_amount: 500000,
      payment_day: 5,
    });

    expect(created.status).toBe("active");
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM contract_signature_cases WHERE contract_id = ?",
        )
        .get(created.id),
    ).toEqual({ count: 0 });
  });

  it("cancels a legacy contract without requiring a signature case", () => {
    const seed = seedContract(db);

    const cancelled = molecule.cancel(seed.contractId);

    expect(cancelled.status).toBe("cancelled");
    expect(
      db
        .prepare("SELECT status FROM motorcycles WHERE id = ?")
        .get(seed.motorcycleId),
    ).toEqual({ status: "available" });
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM contract_signature_cases WHERE contract_id = ?",
        )
        .get(seed.contractId),
    ).toEqual({ count: 0 });
  });

  it("renews a legacy contract without requiring a signature case", () => {
    const seed = seedContract(db);

    const renewed = molecule.renew(seed.contractId, "2100-01-01");

    expect(renewed.status).toBe("renewed");
    expect(renewed.end_date).toBe("2100-01-01");
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM contract_signature_cases WHERE contract_id = ?",
        )
        .get(seed.contractId),
    ).toEqual({ count: 0 });
  });

  it("expires overdue legacy contracts without requiring a signature case", () => {
    const seed = seedContract(db, { endDate: "2000-01-01" });

    expect(molecule.expireOverdue()).toBe(1);
    expect(
      db
        .prepare("SELECT status FROM rental_contracts WHERE id = ?")
        .get(seed.contractId),
    ).toEqual({ status: "expired" });
    expect(
      db
        .prepare("SELECT status FROM motorcycles WHERE id = ?")
        .get(seed.motorcycleId),
    ).toEqual({ status: "available" });
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM contract_signature_cases WHERE contract_id = ?",
        )
        .get(seed.contractId),
    ).toEqual({ count: 0 });
  });

  it("preserves documentary state when cancelling the legacy contract", () => {
    const seed = attachDocumentaryHistory(db, seedContract(db));
    const before = snapshotSignatureHistory(db, seed.caseId);

    expect(molecule.cancel(seed.contractId).status).toBe("cancelled");

    const after = snapshotSignatureHistory(db, seed.caseId);
    expectDocumentaryHistoryUnchanged(before, after);
    expect(after.signatureCase.formalization_status).toBe(
      "pendiente_formalizacion",
    );
  });

  it("preserves documentary state when renewing the legacy contract", () => {
    const seed = attachDocumentaryHistory(db, seedContract(db));
    const before = snapshotSignatureHistory(db, seed.caseId);

    expect(molecule.renew(seed.contractId, "2100-01-01").status).toBe(
      "renewed",
    );

    const after = snapshotSignatureHistory(db, seed.caseId);
    expectDocumentaryHistoryUnchanged(before, after);
    expect(after.signatureCase.formalization_status).toBe(
      "pendiente_formalizacion",
    );
  });

  it("preserves documentary state when expiring the legacy contract", () => {
    const seed = attachDocumentaryHistory(
      db,
      seedContract(db, { endDate: "2000-01-01" }),
    );
    const before = snapshotSignatureHistory(db, seed.caseId);

    expect(molecule.expireOverdue()).toBe(1);

    const after = snapshotSignatureHistory(db, seed.caseId);
    expectDocumentaryHistoryUnchanged(before, after);
    expect(after.signatureCase.formalization_status).toBe(
      "pendiente_formalizacion",
    );
  });

  it("does not require documentary synchronization for legacy mutations", () => {
    const seed = attachDocumentaryHistory(db, seedContract(db));
    const before = snapshotSignatureHistory(db, seed.caseId);
    db.exec(`
      CREATE TRIGGER fail_signature_sync
      BEFORE UPDATE OF formalization_status ON contract_signature_cases
      BEGIN
        SELECT RAISE(ABORT, 'signature synchronization failed');
      END;
    `);

    expect(molecule.cancel(seed.contractId).status).toBe("cancelled");
    expect(
      db
        .prepare("SELECT status FROM motorcycles WHERE id = ?")
        .get(seed.motorcycleId),
    ).toEqual({ status: "available" });
    expectDocumentaryHistoryUnchanged(
      before,
      snapshotSignatureHistory(db, seed.caseId),
    );
  });
});
