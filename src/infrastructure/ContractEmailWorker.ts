import type Database from "better-sqlite3";

import type { ContractEmailQueueInput } from "../molecules/ContractSignatureMolecule.js";
import type { ContractEmailEventType } from "../domains/contractSignature.js";
import { ContractAuditService } from "./ContractAuditService.js";
import type {
  ContractEmailQueueRow,
  ContractEmailSendResult,
  RenderedContractEmail,
} from "./ContractEmailService.js";
import type { ILogger } from "./logger.js";
import { createLogger } from "./logger.js";

export const CONTRACT_EMAIL_MAX_ATTEMPTS = 3;
export const CONTRACT_EMAIL_RETRY_DELAY_MS = 30_000;
export const DEFAULT_PROCESSING_TIMEOUT_MINUTES = 5;

const GENERIC_DELIVERY_ERROR = "Contract email delivery failed.";
const GENERIC_PAYLOAD_ERROR = "Contract email could not be processed safely.";
const PAYLOAD_ERROR_CODE = "contract_email_payload_invalid";
const DELIVERY_ERROR_CODE = "contract_email_delivery_failed";

type ProcessingStatus = "pending" | "processing" | "sent" | "failed";

interface ContractEmailQueueDbRow {
  id: string;
  case_id: string;
  delivery_attempt_id: string | null;
  event_type: ContractEmailEventType;
  recipient_email: string;
  subject: string;
  template_key: string;
  payload_ciphertext: string;
  status: ProcessingStatus;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

interface ClaimedEmail {
  readonly row: ContractEmailQueueDbRow;
  readonly attemptNumber: number;
}

export interface ContractEmailWorkerOptions {
  /** Clock used for claims, retry timestamps, cleanup and audit coordination. */
  readonly now?: () => Date;
  /** Processing rows older than this many minutes are made pending again. */
  readonly processingTimeoutMinutes?: number;
  /** Injectable for deterministic tests; production defaults to exactly 30s. */
  readonly retryDelayMs?: number;
  readonly logger?: ILogger;
}

export interface ContractEmailDeliveryPort {
  readonly isEmailNotificationsEnabled: () => boolean;
  readonly renderQueuedEmail: (
    input: ContractEmailQueueInput | ContractEmailQueueRow,
  ) => RenderedContractEmail;
  readonly sendQueuedEmail: (
    input: ContractEmailQueueInput | ContractEmailQueueRow,
  ) => Promise<ContractEmailSendResult>;
}

/**
 * Durable worker for contract_email_queue.
 *
 * It claims a row in a short SQLite transaction, records the attempt, commits,
 * and only then invokes Nodemailer. Delivery completion is persisted in a
 * second short transaction. Consequently no SMTP call can run while a domain
 * transaction is open, and a crashed worker can be recovered from processing.
 */
export class ContractEmailWorker {
  private readonly now: () => Date;
  private readonly processingTimeoutMinutes: number;
  private readonly retryDelayMs: number;
  private readonly logger: ILogger;

  constructor(
    private readonly db: Database.Database,
    private readonly emailService: ContractEmailDeliveryPort,
    private readonly auditService: ContractAuditService,
    options: ContractEmailWorkerOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.processingTimeoutMinutes = normalizePositiveMinutes(
      options.processingTimeoutMinutes ??
        readProcessingTimeoutMinutes(
          process.env.CONTRACT_EMAIL_PROCESSING_TIMEOUT_MINUTES,
        ),
    );
    this.retryDelayMs = normalizePositiveInteger(
      options.retryDelayMs ?? CONTRACT_EMAIL_RETRY_DELAY_MS,
      "retry delay",
    );
    this.logger = options.logger ?? createLogger("ContractEmailWorker");
  }

  /** Processes all currently ready rows and returns the number sent. */
  async processQueue(): Promise<number> {
    if (!this.emailService.isEmailNotificationsEnabled()) {
      // Disabled notifications remain durable and pending. In particular, do
      // not decrypt merely to decide that no SMTP call should be made.
      return 0;
    }

    const now = this.utcNow();
    this.recoverStaleProcessing(now);
    const readyRows = this.findReadyRows(now);
    let sentCount = 0;

    for (const candidate of readyRows) {
      let claim: ClaimedEmail | null;
      try {
        claim = this.claim(candidate.id, now);
      } catch {
        // The claim transaction rolls back on failure, so it cannot leave a
        // row half-updated. Continue processing independent queue rows.
        this.logger.error("Contract email claim failed", {
          queueId: candidate.id,
        });
        continue;
      }
      if (!claim) continue;

      const input = toQueueInput(claim.row);
      try {
        // Rendering is intentionally separate so an invalid authenticated
        // envelope is permanently failed without SMTP or retrying corrupted
        // ciphertext. The renderer keeps plaintext only in this call stack.
        this.emailService.renderQueuedEmail(input);
      } catch {
        this.finishFailure(
          claim,
          now,
          PAYLOAD_ERROR_CODE,
          GENERIC_PAYLOAD_ERROR,
          true,
        );
        continue;
      }

      try {
        const result = await this.emailService.sendQueuedEmail(input);
        if (!result.sent) {
          // This can only happen if notification configuration changes between
          // the guard above and delivery. Release the claim without changing
          // durable delivery state; the next enabled run can retry it.
          this.releaseClaim(claim.row.id, now);
          continue;
        }
        if (this.finishSuccess(claim, now)) sentCount += 1;
      } catch {
        this.finishFailure(
          claim,
          now,
          DELIVERY_ERROR_CODE,
          GENERIC_DELIVERY_ERROR,
          false,
        );
      }
    }

    return sentCount;
  }

  /** Alias useful to scheduler adapters and operational callers. */
  async runOnce(): Promise<number> {
    return this.processQueue();
  }

  /**
   * Returns stale claims to pending so a process death cannot lose a message.
   * The claim timestamp is updated_at; no payload is read or decrypted here.
   */
  recoverStaleProcessing(now = this.utcNow()): number {
    const cutoff = new Date(
      Date.parse(now) - this.processingTimeoutMinutes * 60_000,
    ).toISOString();
    const result = this.db
      .prepare(
        `UPDATE contract_email_queue
            SET status = 'pending',
                next_retry_at = NULL,
                updated_at = ?
          WHERE status = 'processing'
            AND julianday(updated_at) <= julianday(?)`,
      )
      .run(now, cutoff);
    return result.changes;
  }

  /** Compatibility name for operational code that calls cleanup explicitly. */
  releaseStaleProcessing(now = this.utcNow()): number {
    return this.recoverStaleProcessing(now);
  }

  private findReadyRows(now: string): ContractEmailQueueDbRow[] {
    return this.db
      .prepare(
        `SELECT id, case_id, delivery_attempt_id, event_type, recipient_email,
                subject, template_key, payload_ciphertext, status, attempts,
                next_retry_at, last_error, created_at, updated_at, sent_at
           FROM contract_email_queue
          WHERE status = 'pending'
            AND attempts < ?
            AND (next_retry_at IS NULL OR julianday(next_retry_at) <= julianday(?))
            AND (
              delivery_attempt_id IS NULL
              OR EXISTS (
                SELECT 1
                  FROM contract_delivery_attempts AS delivery_attempt
                 WHERE delivery_attempt.id = contract_email_queue.delivery_attempt_id
                   AND delivery_attempt.case_id = contract_email_queue.case_id
                   AND delivery_attempt.revoked_at IS NULL
              )
            )
          ORDER BY created_at ASC, id ASC`,
      )
      .all(CONTRACT_EMAIL_MAX_ATTEMPTS, now) as ContractEmailQueueDbRow[];
  }

  /** Claims and audits one row atomically, without invoking the transporter. */
  private claim(queueId: string, now: string): ClaimedEmail | null {
    const claimTransaction = this.db.transaction(() => {
      const claimResult = this.db
        .prepare(
          `UPDATE contract_email_queue
              SET status = 'processing', updated_at = ?
            WHERE id = ?
              AND status = 'pending'
              AND (next_retry_at IS NULL OR julianday(next_retry_at) <= julianday(?))
              AND (
                delivery_attempt_id IS NULL
                OR EXISTS (
                  SELECT 1
                    FROM contract_delivery_attempts AS delivery_attempt
                   WHERE delivery_attempt.id = contract_email_queue.delivery_attempt_id
                     AND delivery_attempt.case_id = contract_email_queue.case_id
                     AND delivery_attempt.revoked_at IS NULL
                )
              )`,
        )
        .run(now, queueId, now);
      if (claimResult.changes === 0) return null;

      const row = this.getQueueRow(queueId);
      if (!row || row.status !== "processing") {
        throw new Error("Contract email claim disappeared");
      }
      const attemptNumber = row.attempts + 1;
      if (attemptNumber > CONTRACT_EMAIL_MAX_ATTEMPTS) {
        throw new Error("Contract email retry limit exceeded");
      }

      this.auditService.record({
        eventType: "notification_attempt",
        result: "success",
        actor: { type: "system" },
        caseId: row.case_id,
        deliveryAttemptId: row.delivery_attempt_id,
        metadata: {
          notificationId: row.id,
          eventType: row.event_type,
          recipient: row.recipient_email,
          attemptNumber,
        },
      });

      return { row, attemptNumber };
    });

    return claimTransaction() as ClaimedEmail | null;
  }

  private finishSuccess(claim: ClaimedEmail, now: string): boolean {
    const transaction = this.db.transaction(() => {
      const queueResult = this.db
        .prepare(
          `UPDATE contract_email_queue
              SET status = 'sent',
                  attempts = ?,
                  next_retry_at = NULL,
                  last_error = NULL,
                  sent_at = ?,
                  updated_at = ?
            WHERE id = ? AND status = 'processing'`,
        )
        .run(claim.attemptNumber, now, now, claim.row.id);
      if (queueResult.changes !== 1) {
        throw new Error("Contract email completion lost its claim");
      }

      this.updateDeliveryState(claim.row, "sent", null, now);
      this.auditService.record({
        eventType: "notification_sent",
        result: "success",
        actor: { type: "system" },
        caseId: claim.row.case_id,
        deliveryAttemptId: claim.row.delivery_attempt_id,
        metadata: {
          notificationId: claim.row.id,
          eventType: claim.row.event_type,
          recipient: claim.row.recipient_email,
          attemptNumber: claim.attemptNumber,
        },
      });
      return true;
    });

    return transaction() as boolean;
  }

  private finishFailure(
    claim: ClaimedEmail,
    now: string,
    errorCode: string,
    errorMessage: string,
    permanent: boolean,
  ): void {
    const terminal =
      permanent || claim.attemptNumber >= CONTRACT_EMAIL_MAX_ATTEMPTS;
    const nextRetryAt = terminal
      ? null
      : new Date(Date.parse(now) + this.retryDelayMs).toISOString();
    const status: "pending" | "failed" = terminal ? "failed" : "pending";

    const transaction = this.db.transaction(() => {
      const queueResult = this.db
        .prepare(
          `UPDATE contract_email_queue
              SET status = ?,
                  attempts = ?,
                  next_retry_at = ?,
                  last_error = ?,
                  updated_at = ?
            WHERE id = ? AND status = 'processing'`,
        )
        .run(
          status,
          claim.attemptNumber,
          nextRetryAt,
          errorMessage,
          now,
          claim.row.id,
        );
      if (queueResult.changes !== 1) {
        throw new Error("Contract email failure lost its claim");
      }

      this.updateDeliveryState(claim.row, "failed", errorMessage, now);
      this.auditService.record({
        eventType: "notification_failed",
        result: "failure",
        actor: { type: "system" },
        caseId: claim.row.case_id,
        deliveryAttemptId: claim.row.delivery_attempt_id,
        metadata: {
          notificationId: claim.row.id,
          eventType: claim.row.event_type,
          recipient: claim.row.recipient_email,
          attemptNumber: claim.attemptNumber,
          retryScheduled: !terminal,
        },
        errorCode,
        errorMessage,
      });
    });

    transaction();
  }

  private updateDeliveryState(
    row: ContractEmailQueueDbRow,
    state: "sent" | "failed",
    lastError: string | null,
    now: string,
  ): void {
    if (row.delivery_attempt_id) {
      const attemptResult = this.db
        .prepare(
          `UPDATE contract_delivery_attempts
              SET delivery_status = ?, last_error = ?
            WHERE id = ? AND case_id = ?`,
        )
        .run(state, lastError, row.delivery_attempt_id, row.case_id);
      if (attemptResult.changes !== 1) {
        throw new Error("Contract delivery attempt was not found");
      }
    }

    // A late result from a revoked, older resend must not overwrite the
    // attention state of the newer live attempt. The attempt itself remains
    // historically accurate, but only the current attempt may update the case.
    const caseResult = row.delivery_attempt_id
      ? this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET delivery_attention = ?, updated_at = ?
              WHERE id = ?
                AND EXISTS (
                  SELECT 1 FROM contract_delivery_attempts
                   WHERE id = ? AND case_id = ? AND revoked_at IS NULL
                )`,
          )
          .run(state, now, row.case_id, row.delivery_attempt_id, row.case_id)
      : this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET delivery_attention = ?, updated_at = ?
              WHERE id = ?`,
          )
          .run(state, now, row.case_id);

    // Zero is expected for a revoked historical attempt; for decision emails
    // with no attempt, a missing case is a genuine consistency failure.
    if (!row.delivery_attempt_id && caseResult.changes !== 1) {
      throw new Error("Contract signature case was not found");
    }
  }

  private releaseClaim(queueId: string, now: string): void {
    this.db
      .prepare(
        `UPDATE contract_email_queue
            SET status = 'pending', updated_at = ?
          WHERE id = ? AND status = 'processing'`,
      )
      .run(now, queueId);
  }

  private getQueueRow(queueId: string): ContractEmailQueueDbRow | undefined {
    return this.db
      .prepare(
        `SELECT id, case_id, delivery_attempt_id, event_type, recipient_email,
                subject, template_key, payload_ciphertext, status, attempts,
                next_retry_at, last_error, created_at, updated_at, sent_at
           FROM contract_email_queue
          WHERE id = ?`,
      )
      .get(queueId) as ContractEmailQueueDbRow | undefined;
  }

  private utcNow(): string {
    const value = this.now();
    if (Number.isNaN(value.getTime())) {
      throw new Error("Contract email worker clock returned an invalid date");
    }
    return value.toISOString();
  }
}

function toQueueInput(row: ContractEmailQueueDbRow): ContractEmailQueueInput {
  return {
    id: row.id,
    caseId: row.case_id,
    deliveryAttemptId: row.delivery_attempt_id,
    eventType: row.event_type,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    templateKey: row.template_key,
    payloadCiphertext: row.payload_ciphertext,
    createdAt: row.created_at,
  };
}

function normalizePositiveMinutes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid contract email processing timeout");
  }
  return value;
}

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid contract email ${name}`);
  }
  return value;
}

function readProcessingTimeoutMinutes(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_PROCESSING_TIMEOUT_MINUTES;
  const parsed = Number(value);
  return normalizePositiveMinutes(parsed);
}
