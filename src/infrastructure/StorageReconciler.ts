import type Database from "better-sqlite3";
import { ContractAuditService } from "./ContractAuditService.js";
import type {
  DocumentStorage,
  StoredDocumentEntry,
  TemporaryDocumentEntry,
} from "./DocumentStorage.js";

export type RetentionAction = "retain" | "delete";

/** Independent cleanup windows for immutable versions, failed uploads and quarantine. */
export interface StorageRetentionPolicy {
  readonly versionRetentionMs: number;
  readonly temporaryRetentionMs: number;
  readonly orphanGraceMs: number;
  readonly quarantineRetentionMs: number;
  readonly versionAction: RetentionAction;
  readonly quarantineAction: RetentionAction;
}

export interface StorageReconcilerOptions {
  readonly now?: () => Date;
  readonly processId?: string;
}

export interface StorageReconciliationReport {
  readonly temporariesDeleted: number;
  readonly orphanedObjectsQuarantined: number;
  readonly divergentObjectsQuarantined: number;
  readonly inconsistentVersions: number;
  readonly versionsRetained: number;
  readonly versionsDeleted: number;
  readonly quarantinedObjectsDeleted: number;
}

interface VersionRow {
  readonly id: string;
  readonly case_id: string;
  readonly storage_key: string;
  readonly storage_status:
    | "pending"
    | "ready"
    | "quarantined"
    | "inconsistent"
    | "retained"
    | "deleted";
  readonly size_bytes: number;
  readonly sha256: string;
  readonly uploaded_at: string;
}

interface MutableStorageReconciliationReport {
  temporariesDeleted: number;
  orphanedObjectsQuarantined: number;
  divergentObjectsQuarantined: number;
  inconsistentVersions: number;
  versionsRetained: number;
  versionsDeleted: number;
  quarantinedObjectsDeleted: number;
}

const EMPTY_REPORT: MutableStorageReconciliationReport = {
  temporariesDeleted: 0,
  orphanedObjectsQuarantined: 0,
  divergentObjectsQuarantined: 0,
  inconsistentVersions: 0,
  versionsRetained: 0,
  versionsDeleted: 0,
  quarantinedObjectsDeleted: 0,
};

/**
 * Reconciles the logical metadata inventory with the private object store.
 * It is deliberately conservative: automatic reconciliation only quarantines
 * suspicious data; it never removes a referenced version before the explicit
 * retention policy has elapsed.
 */
export class StorageReconciler {
  private readonly now: () => Date;
  private readonly processId: string;

  constructor(
    private readonly db: Database.Database,
    private readonly storage: DocumentStorage,
    private readonly audit: ContractAuditService,
    private readonly policy: StorageRetentionPolicy,
    options: StorageReconcilerOptions = {},
  ) {
    assertPolicy(policy);
    this.now = options.now ?? (() => new Date());
    this.processId = options.processId ?? "storage-reconciler";
  }

  async reconcile(): Promise<StorageReconciliationReport> {
    const now = this.now();
    if (Number.isNaN(now.getTime()))
      throw new Error("Reconciler clock returned an invalid date");
    const report: MutableStorageReconciliationReport = { ...EMPTY_REPORT };
    const [temporaries, readyObjects, quarantinedObjects] = await Promise.all([
      this.storage.enumerateTemporary(),
      this.storage.enumerate("ready"),
      this.storage.enumerate("quarantined"),
    ]);
    const versions = this.versions();

    await this.removeExpiredTemporaries(temporaries, now, report);
    await this.reconcileReferencedVersions(versions, readyObjects, report);
    await this.quarantineOrphans(versions, readyObjects, now, report);
    await this.applyVersionRetention(versions, now, report);
    await this.applyQuarantineRetention(quarantinedObjects, now, report);
    return report;
  }

  private versions(): VersionRow[] {
    return this.db
      .prepare(
        `SELECT id, case_id, storage_key, storage_status, size_bytes, sha256, uploaded_at
         FROM contract_document_versions`,
      )
      .all() as VersionRow[];
  }

  private async removeExpiredTemporaries(
    temporaries: readonly TemporaryDocumentEntry[],
    now: Date,
    report: MutableStorageReconciliationReport,
  ): Promise<void> {
    for (const temporary of temporaries) {
      if (
        !isExpired(temporary.createdAt, this.policy.temporaryRetentionMs, now)
      )
        continue;
      await this.storage.discardTemporary(temporary);
      report.temporariesDeleted += 1;
      this.audit.record({
        eventType: "storage_reconciled",
        result: "success",
        actor: this.actor(),
        metadata: {
          action: "temporary_deleted",
          storage_key: temporary.temporaryKey,
        },
      });
    }
  }

  private async reconcileReferencedVersions(
    versions: readonly VersionRow[],
    objects: readonly StoredDocumentEntry[],
    report: MutableStorageReconciliationReport,
  ): Promise<void> {
    const objectsByKey = groupByKey(objects);
    const versionsByKey = groupByKey(versions);

    for (const [storageKey, referenced] of versionsByKey) {
      const objectMatches = objectsByKey.get(storageKey) ?? [];
      const duplicateReference = referenced.length !== 1;
      for (const version of referenced) {
        if (
          version.storage_status !== "ready" &&
          version.storage_status !== "retained"
        )
          continue;
        const object =
          objectMatches.length === 1 ? objectMatches[0] : undefined;
        const verified =
          !duplicateReference &&
          object &&
          object.sizeBytes === version.size_bytes &&
          object.sha256 === version.sha256;
        if (verified) continue;

        if (object && objectMatches.length === 1) {
          await this.storage.quarantine(storageKey);
          report.divergentObjectsQuarantined += 1;
          this.audit.record({
            eventType: "storage_quarantined",
            result: "success",
            actor: this.actor(),
            caseId: version.case_id,
            documentVersionId: version.id,
            metadata: {
              storage_key: storageKey,
              reason: duplicateReference
                ? "duplicate_reference"
                : "metadata_divergence",
            },
          });
        }
        this.markInconsistent(
          version,
          object
            ? duplicateReference
              ? "duplicate_reference"
              : "metadata_divergence"
            : "object_missing",
        );
        report.inconsistentVersions += 1;
      }
    }
  }

  private async quarantineOrphans(
    versions: readonly VersionRow[],
    objects: readonly StoredDocumentEntry[],
    now: Date,
    report: MutableStorageReconciliationReport,
  ): Promise<void> {
    const referencedKeys = new Set(
      versions.map((version) => version.storage_key),
    );
    for (const object of objects) {
      if (
        referencedKeys.has(object.storageKey) ||
        !isExpired(object.createdAt, this.policy.orphanGraceMs, now)
      )
        continue;
      await this.storage.quarantine(object.storageKey);
      report.orphanedObjectsQuarantined += 1;
      this.audit.record({
        eventType: "storage_quarantined",
        result: "success",
        actor: this.actor(),
        metadata: { storage_key: object.storageKey, reason: "orphaned_object" },
      });
    }
  }

  private async applyVersionRetention(
    versions: readonly VersionRow[],
    now: Date,
    report: MutableStorageReconciliationReport,
  ): Promise<void> {
    for (const version of versions) {
      if (
        version.storage_status !== "ready" ||
        !isExpired(
          parseDate(version.uploaded_at),
          this.policy.versionRetentionMs,
          now,
        )
      )
        continue;
      if (this.policy.versionAction === "retain") {
        this.db
          .prepare(
            "UPDATE contract_document_versions SET storage_status = 'retained', updated_at = ? WHERE id = ? AND storage_status = 'ready'",
          )
          .run(now.toISOString(), version.id);
        report.versionsRetained += 1;
        this.recordRetention(version, "retained");
        continue;
      }

      await this.storage.deleteForRetention(version.storage_key, {
        retentionExpired: true,
      });
      this.db
        .prepare(
          "UPDATE contract_document_versions SET storage_status = 'deleted', updated_at = ? WHERE id = ? AND storage_status = 'ready'",
        )
        .run(now.toISOString(), version.id);
      report.versionsDeleted += 1;
      this.recordRetention(version, "deleted");
    }
  }

  private async applyQuarantineRetention(
    objects: readonly StoredDocumentEntry[],
    now: Date,
    report: MutableStorageReconciliationReport,
  ): Promise<void> {
    if (this.policy.quarantineAction !== "delete") return;
    for (const object of objects) {
      if (!isExpired(object.createdAt, this.policy.quarantineRetentionMs, now))
        continue;
      await this.storage.deleteQuarantinedForRetention(object.storageKey, {
        retentionExpired: true,
      });
      report.quarantinedObjectsDeleted += 1;
      this.audit.record({
        eventType: "retention_action",
        result: "success",
        actor: this.actor(),
        metadata: {
          storage_key: object.storageKey,
          action: "quarantine_deleted",
        },
      });
    }
  }

  private markInconsistent(version: VersionRow, reason: string): void {
    this.db
      .prepare(
        "UPDATE contract_document_versions SET storage_status = 'inconsistent', updated_at = ? WHERE id = ? AND storage_status IN ('ready', 'retained')",
      )
      .run(this.now().toISOString(), version.id);
    this.audit.record({
      eventType: "storage_reconciled",
      result: "failure",
      actor: this.actor(),
      caseId: version.case_id,
      documentVersionId: version.id,
      metadata: { storage_key: version.storage_key, reason },
      errorCode: "storage_inconsistent",
      errorMessage:
        "Document storage object is unavailable or does not match metadata",
    });
  }

  private recordRetention(
    version: VersionRow,
    action: "retained" | "deleted",
  ): void {
    this.audit.record({
      eventType: "retention_action",
      result: "success",
      actor: this.actor(),
      caseId: version.case_id,
      documentVersionId: version.id,
      metadata: { storage_key: version.storage_key, action },
    });
  }

  private actor(): { type: "system"; id: string } {
    return { type: "system", id: this.processId };
  }
}

function assertPolicy(policy: StorageRetentionPolicy): void {
  for (const value of [
    policy.versionRetentionMs,
    policy.temporaryRetentionMs,
    policy.orphanGraceMs,
    policy.quarantineRetentionMs,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Storage retention policy is invalid");
  }
  if (
    !["retain", "delete"].includes(policy.versionAction) ||
    !["retain", "delete"].includes(policy.quarantineAction)
  ) {
    throw new Error("Storage retention policy is invalid");
  }
}

function groupByKey<
  T extends { readonly storage_key: string } | { readonly storageKey: string },
>(entries: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const key = "storage_key" in entry ? entry.storage_key : entry.storageKey;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return groups;
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error("Document version timestamp is invalid");
  return date;
}

function isExpired(createdAt: Date, retentionMs: number, now: Date): boolean {
  return createdAt.getTime() + retentionMs <= now.getTime();
}
