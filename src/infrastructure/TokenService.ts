import {
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes as secureRandomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Response } from "express";
import type Database from "better-sqlite3";

export const LINK_TOKEN_BYTES = 32;
export const LINK_EXPIRY_DAYS = 7;
export const INVALID_LINK_RESPONSE = Object.freeze({
  status: 404,
  code: "LINK_UNAVAILABLE",
  message: "This link is unavailable.",
});

export interface GeneratedLinkToken {
  /** Use only to construct the notification link; never persist or log it. */
  readonly plaintext: string;
  /** The only token representation permitted in contract_delivery_attempts. */
  readonly tokenHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface ResolvedContractLink {
  readonly kind: "valid";
  readonly attemptId: string;
  readonly caseId: string;
  readonly riderId: string;
  readonly documentVersionId: string;
  readonly expiresAt: string;
}

export type ContractLinkResolution =
  | ResolvedContractLink
  | { readonly kind: "expired"; readonly expiresAt: string }
  | { readonly kind: "invalid" };

interface DeliveryAttemptRow {
  id: string;
  case_id: string;
  rider_id: string;
  document_version_id: string;
  expires_at: string;
}

export interface TokenServiceOptions {
  readonly now?: () => Date;
  readonly randomBytes?: (size: number) => Buffer;
  /** Optional server-held key for HMAC token hashes. */
  readonly hmacSecret?: string | Buffer;
  /** A 32-byte server-held AES key used only for durable outbox payloads. */
  readonly outboxEncryptionKey?: string | Buffer;
}

/**
 * Generates, hashes, resolves, and (when required) encrypts contract-link
 * secrets. Raw tokens are intentionally accepted only at the API boundary and
 * never included in errors, logging, or returned lookup metadata.
 */
export class TokenService {
  private readonly now: () => Date;
  private readonly randomBytes: (size: number) => Buffer;
  private readonly hmacSecret?: string | Buffer;
  private readonly outboxEncryptionKey?: Buffer;

  constructor(
    private readonly db: Database.Database,
    options: TokenServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.randomBytes = options.randomBytes ?? secureRandomBytes;
    this.hmacSecret = options.hmacSecret;
    this.outboxEncryptionKey = options.outboxEncryptionKey
      ? normalizeEncryptionKey(options.outboxEncryptionKey)
      : undefined;
  }

  /** Creates a 256-bit secret and its persistence-safe hash exactly once. */
  generate(): GeneratedLinkToken {
    const createdAt = this.utcNow();
    const plaintext = this.randomBytes(LINK_TOKEN_BYTES).toString("base64url");
    return {
      plaintext,
      tokenHash: this.hash(plaintext),
      createdAt,
      expiresAt: addCalendarDaysUtc(createdAt, LINK_EXPIRY_DAYS),
    };
  }

  /** Hashes a raw token for lookup/persistence without retaining the raw value. */
  hash(token: string): string {
    const value = Buffer.from(token, "utf8");
    return this.hmacSecret
      ? createHmac("sha256", this.hmacSecret).update(value).digest("hex")
      : createHash("sha256").update(value).digest("hex");
  }

  /** Constant-time comparison for stored SHA-256/HMAC values. */
  matches(token: string, storedHash: string): boolean {
    const expected = Buffer.from(this.hash(token), "hex");
    const actual = Buffer.from(storedHash, "hex");
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  /**
   * Resolves only a non-revoked, unexpired attempt. A rider identity, when
   * present from a JWT, must match the attempt without exposing the case.
   */
  resolve(
    token: string,
    authenticatedRiderId?: string,
  ): ContractLinkResolution {
    const tokenHash = this.hash(token);
    const now = this.utcNow();
    const valid = this.db
      .prepare(
        `SELECT attempts.id, attempts.case_id, cases.rider_id,
                attempts.document_version_id, attempts.expires_at
           FROM contract_delivery_attempts AS attempts
           JOIN contract_signature_cases AS cases ON cases.id = attempts.case_id
          WHERE attempts.token_hash = ?
            AND attempts.revoked_at IS NULL
            AND attempts.expires_at > ?
          LIMIT 1`,
      )
      .get(tokenHash, now) as DeliveryAttemptRow | undefined;

    if (valid) {
      if (authenticatedRiderId && authenticatedRiderId !== valid.rider_id) {
        return { kind: "invalid" };
      }
      return {
        kind: "valid",
        attemptId: valid.id,
        caseId: valid.case_id,
        riderId: valid.rider_id,
        documentVersionId: valid.document_version_id,
        expiresAt: valid.expires_at,
      };
    }

    // A controlled expiry response is allowed only for a recognized,
    // non-revoked token; revocation and unknown values remain indistinguishable.
    const expired = this.db
      .prepare(
        `SELECT expires_at
           FROM contract_delivery_attempts
          WHERE token_hash = ?
            AND revoked_at IS NULL
            AND expires_at <= ?
          LIMIT 1`,
      )
      .get(tokenHash, now) as
      | Pick<DeliveryAttemptRow, "expires_at">
      | undefined;

    return expired
      ? { kind: "expired", expiresAt: expired.expires_at }
      : { kind: "invalid" };
  }

  /** Revokes the exact hash now; a later resolution immediately becomes invalid. */
  revoke(tokenHash: string, revokedAt = this.utcNow()): boolean {
    const result = this.db
      .prepare(
        `UPDATE contract_delivery_attempts
            SET revoked_at = ?
          WHERE token_hash = ? AND revoked_at IS NULL`,
      )
      .run(revokedAt, tokenHash);
    return result.changes === 1;
  }

  /** Encrypts durable outbox payloads with AES-256-GCM (authenticated). */
  encryptOutboxPayload(payload: unknown): string {
    const key = this.requireOutboxKey();
    const iv = this.randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  /** Decrypts an authenticated outbox envelope only in memory for delivery. */
  decryptOutboxPayload<T>(envelope: string): T {
    const key = this.requireOutboxKey();
    const [version, ivValue, tagValue, ciphertextValue, ...extra] =
      envelope.split(".");
    if (
      version !== "v1" ||
      !ivValue ||
      !tagValue ||
      !ciphertextValue ||
      extra.length
    ) {
      throw new Error("Invalid encrypted outbox payload");
    }
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivValue, "base64url"),
      );
      decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
      return JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(ciphertextValue, "base64url")),
          decipher.final(),
        ]).toString("utf8"),
      ) as T;
    } catch {
      throw new Error("Invalid encrypted outbox payload");
    }
  }

  private utcNow(): string {
    const now = this.now();
    if (Number.isNaN(now.getTime()))
      throw new Error("Token clock returned an invalid date");
    return now.toISOString();
  }

  private requireOutboxKey(): Buffer {
    if (!this.outboxEncryptionKey) {
      throw new Error("Outbox encryption key is not configured");
    }
    return this.outboxEncryptionKey;
  }
}

/** Applies mandatory anti-leakage headers to every future public link route. */
export function applyPublicLinkSecurityHeaders(response: Response): void {
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cache-Control", "no-store");
}

/** Maps resolution to deliberately minimal public HTTP responses. */
export function sendPublicLinkResolutionError(
  response: Response,
  resolution: Exclude<ContractLinkResolution, ResolvedContractLink>,
): void {
  applyPublicLinkSecurityHeaders(response);
  if (resolution.kind === "expired") {
    response.status(410).json({
      status: 410,
      code: "LINK_EXPIRED",
      message: "This link has expired.",
      expires_at: resolution.expiresAt,
    });
    return;
  }
  response.status(INVALID_LINK_RESPONSE.status).json(INVALID_LINK_RESPONSE);
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

/** In-memory public endpoint limiter keyed by a hash of token and source IP. */
export class TokenIpRateLimiter {
  private readonly entries = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly tokenService: Pick<TokenService, "hash">,
    private readonly limit = 10,
    private readonly windowMs = 60_000,
  ) {
    if (!Number.isInteger(limit) || limit < 1 || windowMs < 1) {
      throw new Error("Invalid public link rate-limit configuration");
    }
  }

  consume(token: string, ip: string, now = Date.now()): RateLimitResult {
    const key = createHash("sha256")
      .update(this.tokenService.hash(token))
      .update("\0")
      .update(ip)
      .digest("hex");
    const existing = this.entries.get(key);
    const entry =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + this.windowMs }
        : existing;
    entry.count += 1;
    this.entries.set(key, entry);
    return {
      allowed: entry.count <= this.limit,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
}

function addCalendarDaysUtc(createdAt: string, days: number): string {
  const date = new Date(createdAt);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalizeEncryptionKey(key: string | Buffer): Buffer {
  const normalized =
    typeof key === "string" ? Buffer.from(key, "base64") : Buffer.from(key);
  if (normalized.length !== 32) {
    throw new Error("Outbox encryption key must be exactly 32 bytes");
  }
  return normalized;
}
/**
 * Independent public-link rate limiter dimensions. The token is reduced to a
 * one-way digest before it reaches the store; the IP is kept only as an
 * internal bucket key and is never returned to the client.
 */
export interface PublicLinkRateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  set(key: string, value: RateLimitEntry): void;
}

export interface PublicLinkRateLimiterOptions {
  readonly tokenLimit?: number;
  readonly ipLimit?: number;
  readonly windowMs?: number;
  readonly now?: () => number;
  readonly store?: PublicLinkRateLimitStore;
  readonly hashToken?: (token: string) => string;
}

export interface PublicLinkRateLimitDecision {
  readonly allowed: boolean;
  readonly tokenAllowed: boolean;
  readonly ipAllowed: boolean;
  readonly retryAfterSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Applies token and source-IP limits as two separate decisions. Keeping the
 * dimensions separate prevents a noisy machine from consuming every token's
 * budget and prevents one token from being probed across many machines.
 */
export class PublicLinkRateLimiter {
  private readonly tokenLimit: number;
  private readonly ipLimit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly store: PublicLinkRateLimitStore;
  private readonly hashToken: (token: string) => string;

  constructor(options: PublicLinkRateLimiterOptions = {}) {
    this.tokenLimit = options.tokenLimit ?? 10;
    this.ipLimit = options.ipLimit ?? 30;
    this.windowMs = options.windowMs ?? 60_000;
    this.now = options.now ?? (() => Date.now());
    this.store = options.store ?? new MapRateLimitStore();
    this.hashToken =
      options.hashToken ??
      ((token: string) =>
        createHash("sha256").update(token, "utf8").digest("hex"));

    if (
      !Number.isInteger(this.tokenLimit) ||
      this.tokenLimit < 1 ||
      !Number.isInteger(this.ipLimit) ||
      this.ipLimit < 1 ||
      !Number.isInteger(this.windowMs) ||
      this.windowMs < 1
    ) {
      throw new Error("Invalid public link rate-limit configuration");
    }
  }

  /** Evaluates both dimensions on every request, even when one is blocked. */
  check(
    token: string,
    ip: string,
    now = this.now(),
  ): PublicLinkRateLimitDecision {
    const tokenResult = this.consume(
      "token",
      this.hashToken(token),
      this.tokenLimit,
      now,
    );
    const ipResult = this.consume("ip", ip, this.ipLimit, now);

    return {
      allowed: tokenResult.allowed && ipResult.allowed,
      tokenAllowed: tokenResult.allowed,
      ipAllowed: ipResult.allowed,
      retryAfterSeconds: Math.max(
        tokenResult.retryAfterSeconds,
        ipResult.retryAfterSeconds,
      ),
    };
  }

  private consume(
    dimension: "token" | "ip",
    key: string,
    limit: number,
    now: number,
  ): RateLimitResult {
    const bucketKey = `${dimension}:${key}`;
    const existing = this.store.get(bucketKey);
    const entry =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + this.windowMs }
        : existing;
    entry.count += 1;
    this.store.set(bucketKey, entry);

    return {
      allowed: entry.count <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
}

class MapRateLimitStore implements PublicLinkRateLimitStore {
  private readonly entries = new Map<string, RateLimitEntry>();

  get(key: string): RateLimitEntry | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: RateLimitEntry): void {
    this.entries.set(key, value);
  }
}
