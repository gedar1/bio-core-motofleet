import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "../../src/infrastructure/database.js";
import {
  ContractAuditService,
  sanitizeAuditMetadata,
} from "../../src/infrastructure/ContractAuditService.js";

const TEST_DB_PATH = path.resolve("data/test-contract-audit.db");
const INITIAL_MIGRATION = path.resolve("src/migrations/001_initial.sql");
const MIGRATIONS_DIR = path.resolve("src/migrations");

function createSignatureCaseFixture(
  db: Database.Database,
  caseId: string,
): void {
  db.prepare(
    "INSERT INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
  ).run("admin-1", "Audit Admin", "audit-admin@example.test", "hash");
  db.prepare(
    `INSERT INTO riders (
    id, name, phone, email, address, password_hash, license_number, license_expiry,
    insurance_number, insurance_expiry, bond_amount, emergency_contact_name, emergency_contact_phone
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "rider-1",
    "Audit Rider",
    "+570000000001",
    "audit-rider@example.test",
    "Test address",
    "hash",
    "LICENSE-1",
    "2030-01-01",
    "INSURANCE-1",
    "2030-01-01",
    100,
    "Emergency Contact",
    "+570000000002",
  );
  db.prepare(
    `INSERT INTO motorcycles (
    id, plate, brand, model, year, color, engine_cc, soat_expiry, inspection_expiry
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "motorcycle-1",
    "AUD001",
    "Test",
    "Audit",
    2024,
    "Black",
    150,
    "2030-01-01",
    "2030-01-01",
  );
  db.prepare(
    `INSERT INTO rental_contracts (
    id, rider_id, motorcycle_id, start_date, end_date, monthly_amount, payment_day
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "contract-1",
    "rider-1",
    "motorcycle-1",
    "2025-01-01",
    "2025-12-31",
    100,
    1,
  );
  db.prepare(
    `INSERT INTO contract_signature_cases (
    id, contract_id, rider_id, motorcycle_id, created_by
  ) VALUES (?, ?, ?, ?, ?)`,
  ).run(caseId, "contract-1", "rider-1", "motorcycle-1", "admin-1");
}

describe("ContractAuditService", () => {
  let db: Database.Database;

  beforeEach(() => {
    fs.rmSync(TEST_DB_PATH, { force: true });
    db = new Database(TEST_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec(fs.readFileSync(INITIAL_MIGRATION, "utf-8"));
    db.exec(
      "CREATE TABLE _migrations (filename TEXT PRIMARY KEY, executed_at TEXT NOT NULL DEFAULT (datetime('now')))",
    );
    db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(
      "001_initial.sql",
    );
    runMigrations(db, MIGRATIONS_DIR);
  });

  afterEach(() => {
    db.close();
    for (const suffix of ["", "-wal", "-shm"])
      fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true });
  });

  it("records UTC successes and controlled, sanitized failures", () => {
    let id = 0;
    const service = new ContractAuditService(db, {
      now: () => new Date("2025-02-03T04:05:06.789Z"),
      createId: () =>
        `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
    });

    const success = service.record({
      eventType: "link_access",
      result: "success",
      actor: { type: "token" },
      caseId: null,
      metadata: { correlation_id: "hash-only", action: "first_access" },
    });
    const failure = service.record({
      eventType: "signed_upload_attempt",
      result: "failure",
      actor: { type: "rider", id: "rider-1" },
      metadata: { token: "never-store", bytes: "never-store", valid: false },
      errorCode: "PDF_UNREADABLE",
      errorMessage: "The uploaded file is not readable",
    });

    expect(success.occurred_at).toBe("2025-02-03T04:05:06.789Z");
    expect(success.metadata).toEqual({
      correlation_id: "hash-only",
      action: "first_access",
    });
    expect(failure.error_code).toBe("pdf_unreadable");
    expect(failure.error_message).toBe("The uploaded file is not readable");
    expect(failure.metadata).toEqual({ valid: false });
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM contract_audit_events").get(),
    ).toEqual({ count: 2 });
  });

  it("uses an immutable descending (occurred_at, id) cursor for case audit history", () => {
    const caseId = "case-1";
    createSignatureCaseFixture(db, caseId);
    const timestamps = [
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2024-12-31T23:59:59.000Z"),
      new Date("2024-12-31T23:59:58.000Z"),
    ];
    let call = 0;
    const ids = ["event-a", "event-c", "event-b", "event-d"];
    const service = new ContractAuditService(db, {
      now: () => timestamps[call],
      createId: () => ids[call++],
    });

    for (let index = 0; index < ids.length; index += 1) {
      service.record({
        eventType: "notification_attempt",
        result: "success",
        actor: { type: "system" },
        caseId,
      });
    }

    const firstPage = service.listForCase(caseId, { limit: 2 });
    const secondPage = service.listForCase(caseId, {
      limit: 2,
      cursor: firstPage.nextCursor!,
    });

    expect(firstPage.data.map((event) => event.id)).toEqual([
      "event-c",
      "event-a",
    ]);
    expect(secondPage.data.map((event) => event.id)).toEqual([
      "event-b",
      "event-d",
    ]);
    expect(firstPage.nextCursor).toBeTruthy();
    expect(secondPage.nextCursor).toBeNull();
  });

  it("redacts prohibited metadata and exposes no destructive service methods", () => {
    expect(
      sanitizeAuditMetadata({
        token: "secret-token",
        nested: { password: "secret", filename: "contract.pdf" },
        markup: "<html>private document</html>",
        useful: "audit marker",
        raw: Buffer.from("bytes"),
      }),
    ).toEqual({
      nested: { filename: "contract.pdf" },
      markup: "[redacted]",
      useful: "audit marker",
    });

    const service = new ContractAuditService(db);
    expect(service).not.toHaveProperty("update");
    expect(service).not.toHaveProperty("delete");
  });
});
