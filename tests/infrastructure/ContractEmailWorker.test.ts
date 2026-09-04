import { beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import path from "node:path";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

import { runMigrations } from "../../src/infrastructure/database.js";
import { ContractAuditService } from "../../src/infrastructure/ContractAuditService.js";
import { ContractEmailService } from "../../src/infrastructure/ContractEmailService.js";
import {
  CONTRACT_EMAIL_MAX_ATTEMPTS,
  ContractEmailWorker,
} from "../../src/infrastructure/ContractEmailWorker.js";
import { TokenService } from "../../src/infrastructure/TokenService.js";
import type { ILogger } from "../../src/infrastructure/logger.js";
import type { ContractEmailEventType } from "../../src/domains/contractSignature.js";

const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => noopLogger,
};

interface Fixture {
  db: Database.Database;
  tokenService: TokenService;
  now: { value: Date };
  caseId: string;
  documentVersionId: string;
  firstAttemptId: string;
}

function createFixture(): Fixture {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db, path.resolve("src/migrations"));

  const now = { value: new Date("2025-03-01T00:00:00.000Z") };
  const adminId = uuidv4();
  const riderId = uuidv4();
  const motorcycleId = uuidv4();
  const contractId = uuidv4();
  const caseId = "case-worker";
  const documentVersionId = "version-worker";
  const firstAttemptId = "attempt-worker-1";
  const timestamp = now.value.toISOString();
  const expiresAt = new Date(now.value.getTime() + 7 * 86_400_000).toISOString();

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
  ).run(contractId, riderId, motorcycleId, timestamp, timestamp);
  db.prepare(
    `INSERT INTO contract_signature_cases
       (id, contract_id, rider_id, motorcycle_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(caseId, contractId, riderId, motorcycleId, adminId, timestamp, timestamp);
  db.prepare(
    `INSERT INTO contract_document_versions
       (id, case_id, version_number, kind, storage_key, storage_status,
        original_filename, mime_type, size_bytes, sha256,
        uploaded_by_type, uploaded_by_id, created_at, uploaded_at, updated_at)
     VALUES (?, ?, 1, 'original', 'worker-original', 'ready',
        'contract.pdf', 'application/pdf', 1, ?, 'admin', ?, ?, ?, ?)`,
  ).run(documentVersionId, caseId, "a".repeat(64), adminId, timestamp, timestamp, timestamp);
  db.prepare(
    `UPDATE contract_signature_cases SET original_version_id = ? WHERE id = ?`,
  ).run(documentVersionId, caseId);
  db.prepare(
    `INSERT INTO contract_delivery_attempts
       (id, case_id, document_version_id, attempt_number, token_hash,
        created_at, expires_at, delivery_status, created_by)
     VALUES (?, ?, ?, 1, ?, ?, ?, 'queued', ?)`,
  ).run(
    firstAttemptId,
    caseId,
    documentVersionId,
    "b".repeat(64),
    timestamp,
    expiresAt,
    adminId,
  );

  return {
    db,
    tokenService: new TokenService(db, { outboxEncryptionKey: Buffer.alloc(32, 7) }),
    now,
    caseId,
    documentVersionId,
    firstAttemptId,
  };
}

function createTransporter(
  implementation: () => Promise<unknown> = async () => ({ messageId: "worker-message" }),
) {
  const sendMail = vi.fn(implementation);
  return {
    sendMail,
  } as unknown as nodemailer.Transporter & { sendMail: ReturnType<typeof vi.fn> };
}

function createServices(fixture: Fixture, transporter: nodemailer.Transporter) {
  const emailService = new ContractEmailService(
    fixture.db,
    fixture.tokenService,
    noopLogger,
    {
      transporter,
      emailNotificationsEnabled: true,
      env: { SMTP_HOST: "smtp.example.test", SMTP_FROM: "noreply@example.test" },
    },
  );
  const auditService = new ContractAuditService(fixture.db, {
    now: () => new Date(fixture.now.value),
  });
  const worker = new ContractEmailWorker(fixture.db, emailService, auditService, {
    now: () => new Date(fixture.now.value),
    processingTimeoutMinutes: 5,
    retryDelayMs: 30_000,
    logger: noopLogger,
  });
  return { emailService, auditService, worker };
}

function queueDeliveryEmail(
  fixture: Fixture,
  emailService: ContractEmailService,
  id = "queue-worker-1",
  deliveryAttemptId = fixture.firstAttemptId,
  eventType: ContractEmailEventType = "contract_sent",
  token = "secret-token-value",
): void {
  const createdAt = fixture.now.value.toISOString();
  emailService.queueContractEmail({
    id,
    caseId: fixture.caseId,
    deliveryAttemptId,
    eventType,
    recipientEmail: "rider@example.com",
    subject: "ignored by canonical service",
    templateKey: "ignored by canonical service",
    payloadCiphertext: fixture.tokenService.encryptOutboxPayload({
      eventType,
      contractId: "contract-worker",
      link: `https://example.test/access/${token}`,
      expiresAt: "2025-03-08T00:00:00.000Z",
    }),
    createdAt,
  });
}

function auditEvents(fixture: Fixture): Array<{ event_type: string; metadata_json: string; error_message: string | null }> {
  return fixture.db
    .prepare(
      `SELECT event_type, metadata_json, error_message
         FROM contract_audit_events
        WHERE case_id = ?
        ORDER BY rowid ASC`,
    )
    .all(fixture.caseId) as Array<{ event_type: string; metadata_json: string; error_message: string | null }>;
}

describe("ContractEmailWorker", () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  it("sends successfully and completes queue, delivery, attention, and audit transitions", async () => {
    const transporter = createTransporter();
    const { emailService, worker } = createServices(fixture, transporter);
    queueDeliveryEmail(fixture, emailService);

    await expect(worker.processQueue()).resolves.toBe(1);

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(
      fixture.db.prepare("SELECT status, attempts, sent_at, updated_at FROM contract_email_queue WHERE id = ?").get("queue-worker-1"),
    ).toMatchObject({ status: "sent", attempts: 1 });
    expect(
      fixture.db.prepare("SELECT delivery_status, last_error FROM contract_delivery_attempts WHERE id = ?").get(fixture.firstAttemptId),
    ).toEqual({ delivery_status: "sent", last_error: null });
    expect(
      fixture.db.prepare("SELECT delivery_attention FROM contract_signature_cases WHERE id = ?").get(fixture.caseId),
    ).toEqual({ delivery_attention: "sent" });
    expect(auditEvents(fixture).map((event) => event.event_type)).toEqual([
      "notification_attempt",
      "notification_sent",
    ]);
  });

  it("permanently fails manipulated ciphertext with only generic durable errors", async () => {
    const transporter = createTransporter();
    const { emailService, auditService, worker } = createServices(fixture, transporter);
    queueDeliveryEmail(fixture, emailService, "queue-tampered", fixture.firstAttemptId, "contract_sent", "secret-never-audit");
    fixture.db
      .prepare("UPDATE contract_email_queue SET payload_ciphertext = substr(payload_ciphertext, 1, length(payload_ciphertext) - 1) || 'x' WHERE id = ?")
      .run("queue-tampered");

    await expect(worker.processQueue()).resolves.toBe(0);

    expect(transporter.sendMail).not.toHaveBeenCalled();
    expect(
      fixture.db.prepare("SELECT status, attempts, last_error, next_retry_at FROM contract_email_queue WHERE id = ?").get("queue-tampered"),
    ).toEqual({
      status: "failed",
      attempts: 1,
      last_error: "Contract email could not be processed safely.",
      next_retry_at: null,
    });
    expect(
      fixture.db.prepare("SELECT delivery_status, last_error FROM contract_delivery_attempts WHERE id = ?").get(fixture.firstAttemptId),
    ).toEqual({ delivery_status: "failed", last_error: "Contract email could not be processed safely." });
    const events = auditEvents(fixture);
    expect(events.map((event) => event.event_type)).toEqual([
      "notification_attempt",
      "notification_failed",
    ]);
    expect(events[1].error_message).toBe("Contract email could not be processed safely.");
    expect(JSON.stringify(events)).not.toContain("secret-never-audit");
    expect(JSON.stringify(events)).not.toContain("<html");
    expect(auditService).toBeDefined();
  });

  it("schedules recoverable failures exactly 30 seconds apart and definitively fails the third", async () => {
    const transporter = createTransporter(async () => {
      throw new Error("SMTP credential, token and payload must never persist");
    });
    const { emailService, worker } = createServices(fixture, transporter);
    queueDeliveryEmail(fixture, emailService);

    await worker.processQueue();
    expect(fixture.db.prepare("SELECT status, attempts, next_retry_at FROM contract_email_queue WHERE id = ?").get("queue-worker-1")).toEqual({
      status: "pending",
      attempts: 1,
      next_retry_at: "2025-03-01T00:00:30.000Z",
    });

    await worker.processQueue();
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    fixture.now.value = new Date("2025-03-01T00:00:30.000Z");
    await worker.processQueue();
    expect(fixture.db.prepare("SELECT status, attempts, next_retry_at FROM contract_email_queue WHERE id = ?").get("queue-worker-1")).toEqual({
      status: "pending",
      attempts: 2,
      next_retry_at: "2025-03-01T00:01:00.000Z",
    });

    fixture.now.value = new Date("2025-03-01T00:01:00.000Z");
    await worker.processQueue();

    expect(transporter.sendMail).toHaveBeenCalledTimes(CONTRACT_EMAIL_MAX_ATTEMPTS);
    expect(fixture.db.prepare("SELECT status, attempts, next_retry_at, last_error FROM contract_email_queue WHERE id = ?").get("queue-worker-1")).toEqual({
      status: "failed",
      attempts: 3,
      next_retry_at: null,
      last_error: "Contract email delivery failed.",
    });
    expect(fixture.db.prepare("SELECT COUNT(*) AS count FROM contract_document_versions WHERE case_id = ?").get(fixture.caseId)).toEqual({ count: 1 });
    expect(fixture.db.prepare("SELECT COUNT(*) AS count FROM contract_delivery_attempts WHERE case_id = ?").get(fixture.caseId)).toEqual({ count: 1 });
    expect(auditEvents(fixture).filter((event) => event.event_type === "notification_attempt")).toHaveLength(3);
    expect(auditEvents(fixture).filter((event) => event.event_type === "notification_failed")).toHaveLength(3);
    expect(JSON.stringify(auditEvents(fixture))).not.toContain("SMTP credential");
  });

  it("returns an old processing row to pending using the injectable timeout", async () => {
    const transporter = createTransporter();
    const { emailService, worker } = createServices(fixture, transporter);
    queueDeliveryEmail(fixture, emailService);
    fixture.db
      .prepare("UPDATE contract_email_queue SET status = 'processing', updated_at = ? WHERE id = ?")
      .run("2025-02-28T23:54:00.000Z", "queue-worker-1");

    expect(worker.recoverStaleProcessing()).toBe(1);
    expect(fixture.db.prepare("SELECT status, next_retry_at FROM contract_email_queue WHERE id = ?").get("queue-worker-1")).toEqual({
      status: "pending",
      next_retry_at: null,
    });
  });

  it("claims concurrently so two workers can only invoke one SMTP send", async () => {
    const transporter = createTransporter();
    const { emailService, auditService } = createServices(fixture, transporter);
    queueDeliveryEmail(fixture, emailService);
    const worker1 = new ContractEmailWorker(fixture.db, emailService, auditService, {
      now: () => new Date(fixture.now.value),
      logger: noopLogger,
    });
    const worker2 = new ContractEmailWorker(fixture.db, emailService, auditService, {
      now: () => new Date(fixture.now.value),
      logger: noopLogger,
    });

    const first = worker1.processQueue();
    const second = worker2.processQueue();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 0]);
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(fixture.db.prepare("SELECT status, attempts FROM contract_email_queue WHERE id = ?").get("queue-worker-1")).toEqual({
      status: "sent",
      attempts: 1,
    });
  });

  it("keeps a definitive failed row when a later resend creates a new queue row and attempt", async () => {
    const transporter = createTransporter(async () => {
      throw new Error("first SMTP failure");
    });
    const { emailService, worker } = createServices(fixture, transporter);
    queueDeliveryEmail(fixture, emailService);
    await worker.processQueue();
    fixture.db.prepare("UPDATE contract_email_queue SET next_retry_at = ? WHERE id = ?").run("2020-01-01T00:00:00.000Z", "queue-worker-1");
    fixture.db.prepare("UPDATE contract_delivery_attempts SET revoked_at = ?, delivery_status = 'failed' WHERE id = ?").run("2025-03-01T00:00:01.000Z", fixture.firstAttemptId);
    fixture.db.prepare("UPDATE contract_signature_cases SET delivery_attention = 'pending' WHERE id = ?").run(fixture.caseId);
    fixture.db.prepare(
      `INSERT INTO contract_delivery_attempts
         (id, case_id, document_version_id, attempt_number, token_hash,
          created_at, expires_at, delivery_status, created_by)
       SELECT 'attempt-worker-2', case_id, document_version_id, 2, 'c',
              '2025-03-01T00:00:02.000Z', expires_at, 'queued', created_by
         FROM contract_delivery_attempts WHERE id = ?`,
    ).run(fixture.firstAttemptId);
    const secondToken = fixture.tokenService.encryptOutboxPayload({
      eventType: "contract_resent",
      contractId: "contract-worker",
      link: "https://example.test/access/new-token",
      expiresAt: "2025-03-08T00:00:02.000Z",
    });
    emailService.queueContractEmail({
      id: "queue-worker-2",
      caseId: fixture.caseId,
      deliveryAttemptId: "attempt-worker-2",
      eventType: "contract_resent",
      recipientEmail: "rider@example.com",
      subject: "ignored",
      templateKey: "ignored",
      payloadCiphertext: secondToken,
      createdAt: "2025-03-01T00:00:02.000Z",
    });

    (transporter.sendMail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ messageId: "resend-message" });
    fixture.now.value = new Date("2025-03-01T00:00:02.000Z");
    await worker.processQueue();

    expect(fixture.db.prepare("SELECT status, attempts FROM contract_email_queue WHERE id = ?").get("queue-worker-1")).toEqual({ status: "pending", attempts: 1 });
    expect(fixture.db.prepare("SELECT status, attempts FROM contract_email_queue WHERE id = ?").get("queue-worker-2")).toEqual({ status: "sent", attempts: 1 });
    expect(fixture.db.prepare("SELECT COUNT(*) AS count FROM contract_email_queue WHERE case_id = ?").get(fixture.caseId)).toEqual({ count: 2 });
    expect(fixture.db.prepare("SELECT COUNT(*) AS count FROM contract_delivery_attempts WHERE case_id = ?").get(fixture.caseId)).toEqual({ count: 2 });
    expect(fixture.db.prepare("SELECT delivery_attention FROM contract_signature_cases WHERE id = ?").get(fixture.caseId)).toEqual({ delivery_attention: "sent" });
  });
});
