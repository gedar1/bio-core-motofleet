import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

import type { ContractEmailQueueInput } from "../molecules/ContractSignatureMolecule.js";
import type {
  ContractAuditService,
  ContractAuditActor,
} from "./ContractAuditService.js";
import type { ContractEmailWorker } from "./ContractEmailWorker.js";
import type { RepositoryCapacityStatus } from "./ContractDocumentRepository.js";
import type { ILogger } from "./logger.js";
import type { Scheduler, SchedulerClock } from "./scheduler.js";
import type {
  StorageReconciliationReport,
  StorageReconciler,
  StorageRetentionPolicy,
} from "./StorageReconciler.js";

export const CONTRACT_EMAIL_WORKER_INTERVAL_MS = 30_000;
export const CONTRACT_SIGNATURE_EXPIRATION_INTERVAL_MS = 5 * 60_000;
export const DEFAULT_STORAGE_RECONCILIATION_INTERVAL_MS = 15 * 60_000;
export const DEFAULT_STORAGE_CAPACITY_INTERVAL_MS = 15 * 60_000;
export const DEFAULT_STORAGE_RETENTION_POLICY: StorageRetentionPolicy = {
  versionRetentionMs: 30 * 24 * 60 * 60_000,
  temporaryRetentionMs: 60 * 60_000,
  orphanGraceMs: 2 * 60 * 60_000,
  quarantineRetentionMs: 7 * 24 * 60 * 60_000,
  // Version content is retained by default. Deletion requires an explicit
  // policy setting after the retention deadline has elapsed.
  versionAction: "retain",
  quarantineAction: "delete",
};

export interface ContractExpirationOutbox {
  queueContractEmail(input: ContractEmailQueueInput): void;
}

export interface ContractSignatureSchedulerMetrics {
  observeReconciliation?(
    report: StorageReconciliationReport,
  ): void | Promise<void>;
  observeCapacity?(status: RepositoryCapacityStatus): void | Promise<void>;
  alertCapacity?(
    status: RepositoryCapacityStatus,
    threshold: number,
  ): void | Promise<void>;
}

export interface ContractSignatureSchedulerJobsOptions {
  readonly now?: SchedulerClock;
  readonly logger?: ILogger;
  readonly processId?: string;
  readonly adminEmail?: string;
  readonly outbox?: ContractExpirationOutbox;
  readonly encryptOutboxPayload?: (payload: Record<string, unknown>) => string;
  readonly createId?: () => string;
  readonly metrics?: ContractSignatureSchedulerMetrics;
}

export interface ContractSignatureSchedulerJobsDependencies extends ContractSignatureSchedulerJobsOptions {
  readonly db: Database.Database;
  readonly audit: ContractAuditService;
  readonly storageReconciler: StorageReconciler;
  readonly capacityMonitor?: {
    status(): Promise<RepositoryCapacityStatus>;
  };
}

interface ExpiredAttemptRow {
  readonly attempt_id: string;
  readonly case_id: string;
  readonly contract_id: string;
  readonly document_version_id: string;
  readonly expires_at: string;
  readonly document_status: "enviado" | "accedido";
}

interface SignatureCaseRow {
  readonly id: string;
  readonly contract_id: string;
  readonly document_status: string;
}

interface QueueAdminRow {
  readonly email: string;
}

/**
 * Domain jobs used by Scheduler. Every public run method is safe to call from
 * a timer: it catches its own errors, records a sanitized operational event
 * when possible, and never lets a maintenance failure escape the process.
 */
export class ContractSignatureSchedulerJobs {
  private readonly now: SchedulerClock;
  private readonly logger?: ILogger;
  private readonly processId: string;
  private readonly createId: () => string;
  private readonly lastReconciliationSignature = {
    value: null as string | null,
  };
  private lastCapacitySignature: string | null = null;
  private lastAlertThreshold: number | null = null;

  constructor(
    private readonly dependencies: ContractSignatureSchedulerJobsDependencies,
  ) {
    this.now = dependencies.now ?? (() => new Date());
    this.logger = dependencies.logger;
    this.processId = dependencies.processId ?? "contract-signature-scheduler";
    this.createId = dependencies.createId ?? randomUUID;
  }

  /**
   * Expires each currently-live, overdue link at most once. The candidate
   * query and every re-check/mutation run in one BEGIN IMMEDIATE transaction,
   * so an upload or resend cannot race an expiry decision.
   */
  async expireLinks(): Promise<number> {
    const now = this.utcNow();
    try {
      const operation = this.dependencies.db.transaction(() => {
        const candidates = this.dependencies.db
          .prepare(
            `SELECT attempts.id AS attempt_id,
                    attempts.case_id,
                    cases.contract_id,
                    attempts.document_version_id,
                    attempts.expires_at,
                    cases.document_status
               FROM contract_delivery_attempts AS attempts
               JOIN contract_signature_cases AS cases
                 ON cases.id = attempts.case_id
              WHERE attempts.revoked_at IS NULL
                AND attempts.expires_at <= ?
                AND cases.document_status IN ('enviado', 'accedido')
                AND NOT EXISTS (
                  SELECT 1
                    FROM contract_document_versions AS signed
                   WHERE signed.case_id = cases.id
                    AND signed.kind = 'signed'
                     AND signed.storage_status IN ('ready', 'retained')
                )
              ORDER BY attempts.expires_at ASC, attempts.id ASC`,
          )
          .all(now) as ExpiredAttemptRow[];

        let expiredCases = 0;
        const revoke = this.dependencies.db.prepare(
          `UPDATE contract_delivery_attempts
              SET revoked_at = ?
            WHERE id = ?
              AND revoked_at IS NULL
              AND expires_at <= ?`,
        );

        for (const candidate of candidates) {
          const revoked = revoke.run(now, candidate.attempt_id, now).changes;
          if (revoked !== 1) continue;

          this.recordAudit({
            eventType: "link_revoked",
            result: "success",
            actor: this.systemActor(),
            caseId: candidate.case_id,
            documentVersionId: candidate.document_version_id,
            deliveryAttemptId: candidate.attempt_id,
            metadata: {
              reason: "link_expired",
              expiresAt: candidate.expires_at,
            },
          });

          // A case can have more than one anomalously-live link. Once the first
          // one transitions the case, subsequent rows are only revoked and do
          // not enqueue another notification.
          const changed = this.dependencies.db
            .prepare(
              `UPDATE contract_signature_cases
                  SET document_status = 'expirado', updated_at = ?
                WHERE id = ?
                  AND document_status IN ('enviado', 'accedido')
                  AND NOT EXISTS (
                    SELECT 1
                      FROM contract_document_versions AS signed
                     WHERE signed.case_id = contract_signature_cases.id
                       AND signed.kind = 'signed'
                       AND signed.storage_status IN ('ready', 'retained')
                  )`,
            )
            .run(now, candidate.case_id).changes;

          if (changed !== 1) continue;

          this.enqueueExpirationNotice(candidate, now);
          this.recordAudit({
            eventType: "link_expired",
            result: "success",
            actor: this.systemActor(),
            caseId: candidate.case_id,
            documentVersionId: candidate.document_version_id,
            deliveryAttemptId: candidate.attempt_id,
            metadata: {
              expiresAt: candidate.expires_at,
              notification: "queued",
            },
          });
          expiredCases += 1;
        }

        return expiredCases;
      });

      return (
        operation as ReturnType<typeof this.dependencies.db.transaction>
      ).immediate() as number;
    } catch (error: unknown) {
      this.captureJobError("link_expiration", error);
      return 0;
    }
  }

  /** Alias for scheduler adapters and operational callers. */
  async runExpiration(): Promise<number> {
    return this.expireLinks();
  }

  async reconcileStorage(): Promise<StorageReconciliationReport | null> {
    try {
      const report = await this.dependencies.storageReconciler.reconcile();
      await this.observeMetrics(
        this.dependencies.metrics?.observeReconciliation,
        report,
        "reconciliation_metrics",
      );

      const signature = JSON.stringify(report);
      if (
        signature !==
          JSON.stringify({
            temporariesDeleted: 0,
            orphanedObjectsQuarantined: 0,
            divergentObjectsQuarantined: 0,
            inconsistentVersions: 0,
            versionsRetained: 0,
            versionsDeleted: 0,
            quarantinedObjectsDeleted: 0,
          }) &&
        signature !== this.lastReconciliationSignature.value
      ) {
        this.recordAudit({
          eventType: "storage_reconciled",
          result: "success",
          actor: this.systemActor(),
          metadata: {
            job: "storage_reconciliation",
            ...report,
          },
        });
      }
      this.lastReconciliationSignature.value = signature;
      return report;
    } catch (error: unknown) {
      this.captureJobError("storage_reconciliation", error);
      return null;
    }
  }

  /** Alias for scheduler adapters and operational callers. */
  async runReconciliation(): Promise<StorageReconciliationReport | null> {
    return this.reconcileStorage();
  }

  async monitorCapacity(): Promise<RepositoryCapacityStatus | null> {
    if (!this.dependencies.capacityMonitor) return null;
    try {
      const status = await this.dependencies.capacityMonitor.status();
      await this.observeMetrics(
        this.dependencies.metrics?.observeCapacity,
        status,
        "capacity_metrics",
      );

      const signature = JSON.stringify(status);
      if (signature !== this.lastCapacitySignature) {
        this.recordAudit({
          eventType: "storage_reconciled",
          result: "success",
          actor: this.systemActor(),
          metadata: {
            job: "capacity_monitor",
            usedBytes: status.usedBytes,
            quotaBytes: status.quotaBytes,
            availableBytes: status.availableBytes,
            temporaryBytes: status.temporaryBytes,
            orphanBytes: status.orphanBytes,
            writeErrors: status.writeErrors,
            quotaPercent: status.quotaPercent,
            thresholdsReached: [...status.thresholdsReached],
          },
        });
        this.lastCapacitySignature = signature;
      }

      const highestThreshold = status.thresholdsReached.at(-1) ?? null;
      const crossedThreshold =
        highestThreshold !== null &&
        (this.lastAlertThreshold === null ||
          highestThreshold > this.lastAlertThreshold);
      if (crossedThreshold) {
        await this.observeMetrics(
          this.dependencies.metrics?.alertCapacity,
          status,
          "capacity_alert",
          highestThreshold,
        );
      }
      this.lastAlertThreshold = highestThreshold;
      return status;
    } catch (error: unknown) {
      this.captureJobError("capacity_monitor", error);
      return null;
    }
  }

  /** Alias for scheduler adapters and operational callers. */
  async runCapacityMonitor(): Promise<RepositoryCapacityStatus | null> {
    return this.monitorCapacity();
  }

  /** True when the capacity job can be registered for this deployment. */
  hasCapacityMonitor(): boolean {
    return this.dependencies.capacityMonitor !== undefined;
  }

  private enqueueExpirationNotice(
    candidate: ExpiredAttemptRow,
    now: string,
  ): void {
    const outbox = this.dependencies.outbox;
    if (!outbox) {
      throw new Error("Contract expiration outbox is not configured");
    }

    const recipientEmail = this.getAdminEmail();
    if (!recipientEmail) {
      throw new Error("No administrative notification recipient is configured");
    }

    const payload = {
      eventType: "link_expired",
      caseId: candidate.case_id,
      contractId: candidate.contract_id,
      expiresAt: candidate.expires_at,
      action: "resend_or_manual_attention",
    } satisfies Record<string, unknown>;
    const encrypt = this.dependencies.encryptOutboxPayload;
    if (!encrypt) {
      throw new Error(
        "Contract expiration outbox encryption is not configured",
      );
    }

    outbox.queueContractEmail({
      id: this.createId(),
      caseId: candidate.case_id,
      deliveryAttemptId: candidate.attempt_id,
      eventType: "link_expired",
      recipientEmail,
      subject: "A MotoFleet contract link has expired",
      templateKey: "link_expired",
      payloadCiphertext: encrypt(payload),
      createdAt: now,
    });
  }

  private getAdminEmail(): string | null {
    const configured =
      this.dependencies.adminEmail?.trim() ||
      process.env.CONTRACT_ADMIN_EMAIL?.trim() ||
      process.env.ADMIN_EMAIL?.trim();
    if (configured) return configured;

    const row = this.dependencies.db
      .prepare(
        `SELECT email
           FROM admins
          WHERE status = 'active' AND TRIM(email) <> ''
          ORDER BY id ASC
          LIMIT 1`,
      )
      .get() as QueueAdminRow | undefined;
    return row?.email.trim() || null;
  }

  private async observeMetrics<T, TArgs extends readonly unknown[]>(
    observer: ((value: T, ...args: TArgs) => void | Promise<void>) | undefined,
    value: T,
    operation: string,
    ...args: TArgs
  ): Promise<void> {
    if (!observer) return;
    try {
      await observer(value, ...args);
    } catch (error: unknown) {
      this.logger?.warn("Scheduler metrics observer failed", {
        operation,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  private recordAudit(
    input: Parameters<ContractAuditService["record"]>[0],
  ): void {
    this.dependencies.audit.record(input);
  }

  private captureJobError(job: string, error: unknown): void {
    this.logger?.error("Contract maintenance job failed", {
      job,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    try {
      this.dependencies.audit.record({
        eventType:
          job === "link_expiration"
            ? "transition_failed"
            : "storage_reconciled",
        result: "failure",
        actor: this.systemActor(),
        metadata: { job },
        errorCode: "scheduled_job_failed",
        errorMessage: "Contract maintenance job failed.",
      });
    } catch (auditError: unknown) {
      this.logger?.warn("Unable to audit contract maintenance failure", {
        job,
        errorType:
          auditError instanceof Error ? auditError.name : "UnknownError",
      });
    }
  }

  private systemActor(): ContractAuditActor {
    return { type: "system", id: this.processId };
  }

  private utcNow(): string {
    const value = this.now();
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Contract scheduler clock returned an invalid date");
    }
    return date.toISOString();
  }
}

export interface SchedulerIntervals {
  readonly emailWorkerMs: number;
  readonly expirationMs: number;
  readonly reconciliationMs: number;
  readonly capacityMs: number;
}

/** Reads only positive integer millisecond intervals; invalid configuration fails closed. */
export function readSchedulerIntervals(
  env: NodeJS.ProcessEnv = process.env,
): SchedulerIntervals {
  return {
    emailWorkerMs: CONTRACT_EMAIL_WORKER_INTERVAL_MS,
    expirationMs: CONTRACT_SIGNATURE_EXPIRATION_INTERVAL_MS,
    reconciliationMs: readInterval(
      env,
      [
        "CONTRACT_STORAGE_RECONCILIATION_INTERVAL_MS",
        "CONTRACT_RECONCILIATION_INTERVAL_MS",
        "STORAGE_RECONCILIATION_INTERVAL_MS",
        "SCHEDULER_RECONCILIATION_INTERVAL_MS",
      ],
      DEFAULT_STORAGE_RECONCILIATION_INTERVAL_MS,
    ),
    capacityMs: readInterval(
      env,
      [
        "CONTRACT_STORAGE_CAPACITY_INTERVAL_MS",
        "CONTRACT_CAPACITY_INTERVAL_MS",
        "STORAGE_CAPACITY_INTERVAL_MS",
        "SCHEDULER_CAPACITY_INTERVAL_MS",
      ],
      DEFAULT_STORAGE_CAPACITY_INTERVAL_MS,
    ),
  };
}

function readInterval(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: number,
): number {
  const configuredName = names.find((name) => env[name]?.trim());
  if (!configuredName) return fallback;
  const value = Number(env[configuredName]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Contract scheduler interval configuration is invalid");
  }
  return value;
}

export function readStorageRetentionPolicy(
  env: NodeJS.ProcessEnv = process.env,
): StorageRetentionPolicy {
  return {
    versionRetentionMs: readNonNegativeInterval(
      env.CONTRACT_DOCUMENT_VERSION_RETENTION_MS,
      DEFAULT_STORAGE_RETENTION_POLICY.versionRetentionMs,
    ),
    temporaryRetentionMs: readNonNegativeInterval(
      env.CONTRACT_DOCUMENT_TEMPORARY_RETENTION_MS,
      DEFAULT_STORAGE_RETENTION_POLICY.temporaryRetentionMs,
    ),
    orphanGraceMs: readNonNegativeInterval(
      env.CONTRACT_DOCUMENT_ORPHAN_GRACE_MS,
      DEFAULT_STORAGE_RETENTION_POLICY.orphanGraceMs,
    ),
    quarantineRetentionMs: readNonNegativeInterval(
      env.CONTRACT_DOCUMENT_QUARANTINE_RETENTION_MS,
      DEFAULT_STORAGE_RETENTION_POLICY.quarantineRetentionMs,
    ),
    versionAction: readRetentionAction(
      env.CONTRACT_DOCUMENT_VERSION_RETENTION_ACTION,
      DEFAULT_STORAGE_RETENTION_POLICY.versionAction,
    ),
    quarantineAction: readRetentionAction(
      env.CONTRACT_DOCUMENT_QUARANTINE_RETENTION_ACTION,
      DEFAULT_STORAGE_RETENTION_POLICY.quarantineAction,
    ),
  };
}

function readNonNegativeInterval(
  value: string | undefined,
  fallback: number,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Contract document retention configuration is invalid");
  }
  return parsed;
}

function readRetentionAction(
  value: string | undefined,
  fallback: StorageRetentionPolicy["versionAction"],
): StorageRetentionPolicy["versionAction"] {
  if (!value?.trim()) return fallback;
  if (value !== "retain" && value !== "delete") {
    throw new Error("Contract document retention configuration is invalid");
  }
  return value;
}

export interface RegisterContractSignatureJobsOptions {
  readonly scheduler: Scheduler;
  readonly emailWorker: Pick<ContractEmailWorker, "processQueue" | "runOnce">;
  readonly jobs: ContractSignatureSchedulerJobs;
  readonly intervals?: SchedulerIntervals;
  readonly logger?: ILogger;
}

/**
 * Registers in the required startup order. `Scheduler` owns timer cleanup;
 * this function only supplies safe, injectable callbacks.
 */
export function registerContractSignatureJobs(
  options: RegisterContractSignatureJobsOptions,
): void {
  const intervals = options.intervals ?? readSchedulerIntervals();
  const log = options.logger;

  options.scheduler.register(
    "contract-email-worker",
    "Process contract email outbox",
    intervals.emailWorkerMs,
    async () => {
      try {
        await options.emailWorker.runOnce();
      } catch (error: unknown) {
        log?.error("Contract email worker failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      }
    },
  );
  options.scheduler.register(
    "expire-contract-signature-links",
    "Expire contract signature links",
    intervals.expirationMs,
    async () => {
      await options.jobs.expireLinks();
    },
  );
  options.scheduler.register(
    "reconcile-contract-storage",
    "Reconcile contract document storage",
    intervals.reconciliationMs,
    async () => {
      await options.jobs.reconcileStorage();
    },
  );
  if (options.jobs.hasCapacityMonitor()) {
    options.scheduler.register(
      "monitor-contract-storage-capacity",
      "Monitor contract document storage capacity",
      intervals.capacityMs,
      async () => {
        await options.jobs.monitorCapacity();
      },
    );
  }
}
