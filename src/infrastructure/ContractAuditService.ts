import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  CONTRACT_AUDIT_EVENT_TYPES,
  CONTRACT_SIGNATURE_ACTOR_TYPES,
  type AuditResult,
  type ContractAuditEventType,
  type ContractSignatureActorType,
} from "../domains/contractSignature.js";
import { ValidationError } from "../domains/errors.js";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_METADATA_DEPTH = 5;
const MAX_METADATA_ENTRIES = 30;
const MAX_STRING_LENGTH = 500;
const REDACTED_VALUE = "[redacted]";
const GENERIC_ERROR_MESSAGE = "Operation failed";
const SENSITIVE_KEY =
  /token|password|secret|credential|authorization|cookie|bytes?|binary|buffer|html|content|body|pdf|file.?data/i;
const SENSITIVE_VALUE =
  /(?:bearer\s+|password\s*[=:]|token\s*[=:]|<\/?[a-z][^>]*>)/i;
const SAFE_ERROR_CODE = /^[a-z0-9_.-]{1,64}$/;

export interface ContractAuditActor {
  readonly type: ContractSignatureActorType;
  readonly id?: string | null;
}

export interface RecordContractAuditEventInput {
  readonly eventType: ContractAuditEventType;
  readonly result: AuditResult;
  readonly actor: ContractAuditActor;
  readonly caseId?: string | null;
  readonly documentVersionId?: string | null;
  readonly deliveryAttemptId?: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly errorCode?: string | null;
  readonly errorMessage?: string | null;
}

export interface ContractAuditEvent {
  readonly id: string;
  readonly case_id: string | null;
  readonly event_type: ContractAuditEventType;
  readonly occurred_at: string;
  readonly result: AuditResult;
  readonly actor_type: ContractSignatureActorType;
  readonly actor_id: string | null;
  readonly document_version_id: string | null;
  readonly delivery_attempt_id: string | null;
  readonly metadata: Record<string, unknown>;
  readonly error_code: string | null;
  readonly error_message: string | null;
}

export interface ContractAuditPage {
  readonly data: readonly ContractAuditEvent[];
  readonly nextCursor: string | null;
}

export interface ContractAuditServiceOptions {
  readonly now?: () => Date;
  readonly createId?: () => string;
}

interface ContractAuditEventRow {
  id: string;
  case_id: string | null;
  event_type: ContractAuditEventType;
  occurred_at: string;
  result: AuditResult;
  actor_type: ContractSignatureActorType;
  actor_id: string | null;
  document_version_id: string | null;
  delivery_attempt_id: string | null;
  metadata_json: string;
  error_code: string | null;
  error_message: string | null;
}

interface AuditCursor {
  readonly occurredAt: string;
  readonly id: string;
}

/**
 * The sole application-level writer for contract-signature audit events.
 * It deliberately exposes only insertion and administrative reads: events
 * cannot be edited or deleted by this service.
 */
export class ContractAuditService {
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(
    private readonly db: Database.Database,
    options: ContractAuditServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
  }

  record(input: RecordContractAuditEventInput): ContractAuditEvent {
    this.assertInput(input);
    const occurredAt = this.utcNow();
    const row: ContractAuditEventRow = {
      id: this.createId(),
      case_id: input.caseId ?? null,
      event_type: input.eventType,
      occurred_at: occurredAt,
      result: input.result,
      actor_type: input.actor.type,
      actor_id: input.actor.id ?? null,
      document_version_id: input.documentVersionId ?? null,
      delivery_attempt_id: input.deliveryAttemptId ?? null,
      metadata_json: JSON.stringify(sanitizeAuditMetadata(input.metadata)),
      error_code: normalizeErrorCode(input.errorCode),
      error_message: sanitizeErrorMessage(input.errorMessage),
    };

    this.db
      .prepare(
        `INSERT INTO contract_audit_events (
          id, case_id, event_type, occurred_at, result, actor_type, actor_id,
          document_version_id, delivery_attempt_id, metadata_json, error_code, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.case_id,
        row.event_type,
        row.occurred_at,
        row.result,
        row.actor_type,
        row.actor_id,
        row.document_version_id,
        row.delivery_attempt_id,
        row.metadata_json,
        row.error_code,
        row.error_message,
      );

    return this.toEvent(row);
  }

  /** Returns an administrative history page with a stable descending cursor. */
  listForCase(
    caseId: string,
    options: { limit?: number; cursor?: string } = {},
  ): ContractAuditPage {
    const limit = normalizeLimit(options.limit);
    const cursor = options.cursor ? decodeCursor(options.cursor) : null;
    const rows = this.db
      .prepare(
        `SELECT id, case_id, event_type, occurred_at, result, actor_type, actor_id,
                document_version_id, delivery_attempt_id, metadata_json, error_code, error_message
           FROM contract_audit_events
          WHERE case_id = ?
            AND (? IS NULL OR occurred_at < ? OR (occurred_at = ? AND id < ?))
          ORDER BY occurred_at DESC, id DESC
          LIMIT ?`,
      )
      .all(
        caseId,
        cursor?.occurredAt ?? null,
        cursor?.occurredAt ?? null,
        cursor?.occurredAt ?? null,
        cursor?.id ?? null,
        limit + 1,
      ) as ContractAuditEventRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const finalRow = pageRows.at(-1);

    return {
      data: pageRows.map((row) => this.toEvent(row)),
      nextCursor:
        hasMore && finalRow
          ? encodeCursor({ occurredAt: finalRow.occurred_at, id: finalRow.id })
          : null,
    };
  }

  private assertInput(input: RecordContractAuditEventInput): void {
    if (!CONTRACT_AUDIT_EVENT_TYPES.includes(input.eventType)) {
      throw new Error("Unsupported contract audit event type");
    }
    if (input.result !== "success" && input.result !== "failure") {
      throw new Error("Unsupported contract audit result");
    }
    if (!CONTRACT_SIGNATURE_ACTOR_TYPES.includes(input.actor.type)) {
      throw new Error("Unsupported contract audit actor type");
    }
  }

  private utcNow(): string {
    const date = this.now();
    if (Number.isNaN(date.getTime()))
      throw new Error("Audit clock returned an invalid date");
    return date.toISOString();
  }

  private toEvent(row: ContractAuditEventRow): ContractAuditEvent {
    return {
      ...row,
      metadata: parseMetadata(row.metadata_json),
    };
  }
}

/** Removes fields and values that must never enter the durable audit trail. */
export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> {
  if (!metadata) return {};
  return sanitizeObject(metadata, 0);
}

function sanitizeObject(
  value: Record<string, unknown>,
  depth: number,
): Record<string, unknown> {
  if (depth >= MAX_METADATA_DEPTH) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).slice(
    0,
    MAX_METADATA_ENTRIES,
  )) {
    if (SENSITIVE_KEY.test(key)) continue;
    const clean = sanitizeValue(entry, depth + 1);
    if (clean !== undefined) sanitized[key] = clean;
  }
  return sanitized;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const normalized = value.trim().slice(0, MAX_STRING_LENGTH);
    return SENSITIVE_VALUE.test(normalized) ? REDACTED_VALUE : normalized;
  }
  if (Array.isArray(value)) {
    if (depth >= MAX_METADATA_DEPTH) return [];
    return value
      .slice(0, MAX_METADATA_ENTRIES)
      .map((entry) => sanitizeValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }
  if (typeof value === "object" && value && !Buffer.isBuffer(value)) {
    return sanitizeObject(value as Record<string, unknown>, depth);
  }
  return undefined;
}

function normalizeErrorCode(errorCode?: string | null): string | null {
  if (!errorCode) return null;
  const normalized = errorCode.trim().toLowerCase();
  return SAFE_ERROR_CODE.test(normalized) ? normalized : "operation_failed";
}

function sanitizeErrorMessage(errorMessage?: string | null): string | null {
  if (!errorMessage) return null;
  const normalized = errorMessage
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_STRING_LENGTH);
  return normalized && !SENSITIVE_VALUE.test(normalized)
    ? normalized
    : GENERIC_ERROR_MESSAGE;
}

function parseMetadata(metadataJson: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(metadataJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeLimit(limit?: number): number {
  if (!Number.isInteger(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(limit as number, 1), MAX_PAGE_SIZE);
}

function encodeCursor(cursor: AuditCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): AuditCursor {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      typeof (parsed as AuditCursor).occurredAt !== "string" ||
      typeof (parsed as AuditCursor).id !== "string" ||
      Number.isNaN(new Date((parsed as AuditCursor).occurredAt).getTime())
    ) {
      throw new Error();
    }
    return parsed as AuditCursor;
  } catch {
    throw new ValidationError("Invalid pagination cursor", {
      cursor: ["invalid"],
    });
  }
}
