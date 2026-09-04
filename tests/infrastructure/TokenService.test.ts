import Database from "better-sqlite3";
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyPublicLinkSecurityHeaders,
  sendPublicLinkResolutionError,
  TokenIpRateLimiter,
  TokenService,
} from "../../src/infrastructure/TokenService.js";

const NOW = new Date("2025-02-28T23:30:00.000Z");

function createDatabase(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE contract_signature_cases (id TEXT PRIMARY KEY, rider_id TEXT NOT NULL);
    CREATE TABLE contract_delivery_attempts (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      document_version_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );
  `);
  return db;
}

function insertAttempt(
  db: Database.Database,
  tokenService: TokenService,
  values: { token: string; expiresAt: string; revokedAt?: string | null; riderId?: string },
): void {
  const caseId = "case-1";
  db.prepare("INSERT OR IGNORE INTO contract_signature_cases (id, rider_id) VALUES (?, ?)").run(
    caseId,
    values.riderId ?? "rider-1",
  );
  db.prepare(
    `INSERT INTO contract_delivery_attempts
      (id, case_id, document_version_id, token_hash, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    `attempt-${values.token}`,
    caseId,
    "version-1",
    tokenService.hash(values.token),
    values.expiresAt,
    values.revokedAt ?? null,
  );
}

describe("TokenService", () => {
  const databases: Database.Database[] = [];
  const createService = (db = createDatabase()) => {
    databases.push(db);
    return new TokenService(db, {
      now: () => new Date(NOW),
      outboxEncryptionKey: Buffer.alloc(32, 7),
    });
  };

  afterEach(() => {
    while (databases.length) databases.pop()?.close();
  });

  it("creates non-reusable 256-bit secrets and exact UTC seven-calendar-day expirations", () => {
    const tokenService = createService();
    const first = tokenService.generate();
    const second = tokenService.generate();

    expect(Buffer.from(first.plaintext, "base64url")).toHaveLength(32);
    expect(first.plaintext).not.toBe(second.plaintext);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).not.toContain(first.plaintext);
    expect(first.createdAt).toBe("2025-02-28T23:30:00.000Z");
    expect(first.expiresAt).toBe("2025-03-07T23:30:00.000Z");
  });

  it("resolves only a hash-matched, non-revoked, unexpired attempt and enforces rider identity", () => {
    const db = createDatabase();
    const tokenService = createService(db);
    insertAttempt(db, tokenService, {
      token: "valid-token",
      expiresAt: "2025-03-07T23:30:00.000Z",
    });

    expect(tokenService.resolve("valid-token")).toEqual({
      kind: "valid",
      attemptId: "attempt-valid-token",
      caseId: "case-1",
      riderId: "rider-1",
      documentVersionId: "version-1",
      expiresAt: "2025-03-07T23:30:00.000Z",
    });
    expect(tokenService.resolve("valid-token", "other-rider")).toEqual({ kind: "invalid" });
    expect(tokenService.resolve("altered-token")).toEqual({ kind: "invalid" });
  });

  it("revokes a resolved link immediately and never exposes case data for revoked tokens", () => {
    const db = createDatabase();
    const tokenService = createService(db);
    insertAttempt(db, tokenService, {
      token: "revoke-me",
      expiresAt: "2025-03-07T23:30:00.000Z",
    });

    expect(tokenService.revoke(tokenService.hash("revoke-me"))).toBe(true);
    expect(tokenService.resolve("revoke-me")).toEqual({ kind: "invalid" });
  });

  it("returns controlled expiry only for a recognized non-revoked token", () => {
    const db = createDatabase();
    const tokenService = createService(db);
    insertAttempt(db, tokenService, {
      token: "expired-token",
      expiresAt: "2025-02-28T23:29:59.999Z",
    });

    expect(tokenService.resolve("expired-token")).toEqual({
      kind: "expired",
      expiresAt: "2025-02-28T23:29:59.999Z",
    });
  });

  it("uses authenticated encryption for durable link payloads", () => {
    const tokenService = createService();
    const payload = { token: "plain-only-in-envelope", template: "contract_sent" };
    const encrypted = tokenService.encryptOutboxPayload(payload);

    expect(encrypted).not.toContain(payload.token);
    expect(tokenService.decryptOutboxPayload<typeof payload>(encrypted)).toEqual(payload);
    expect(() => tokenService.decryptOutboxPayload(`${encrypted}tampered`)).toThrow(
      "Invalid encrypted outbox payload",
    );
  });

  it("adds anti-leakage headers and uses generic invalid-link responses", async () => {
    const app = express();
    app.get("/invalid", (_req, res) => {
      sendPublicLinkResolutionError(res, { kind: "invalid" });
    });
    app.get("/expired", (_req, res) => {
      applyPublicLinkSecurityHeaders(res);
      sendPublicLinkResolutionError(res, {
        kind: "expired",
        expiresAt: "2025-02-28T23:29:59.999Z",
      });
    });

    const invalid = await request(app).get("/invalid");
    expect(invalid.status).toBe(404);
    expect(invalid.body).toEqual({
      status: 404,
      code: "LINK_UNAVAILABLE",
      message: "This link is unavailable.",
    });
    expect(JSON.stringify(invalid.body)).not.toContain("case");
    expect(invalid.headers["referrer-policy"]).toBe("no-referrer");
    expect(invalid.headers["cache-control"]).toBe("no-store");

    const expired = await request(app).get("/expired");
    expect(expired.status).toBe(410);
    expect(expired.body).toEqual({
      status: 410,
      code: "LINK_EXPIRED",
      message: "This link has expired.",
      expires_at: "2025-02-28T23:29:59.999Z",
    });
  });

  it("limits requests by a non-reversible token/IP key", () => {
    const tokenService = createService();
    const limiter = new TokenIpRateLimiter(tokenService, 2, 1_000);

    expect(limiter.consume("token", "203.0.113.1", 10).allowed).toBe(true);
    expect(limiter.consume("token", "203.0.113.1", 20).allowed).toBe(true);
    expect(limiter.consume("token", "203.0.113.1", 30)).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(limiter.consume("token", "203.0.113.2", 30).allowed).toBe(true);
  });
});
