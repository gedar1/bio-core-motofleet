import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { ContractAuditService } from "./ContractAuditService.js";
import {
  DocumentStorageError,
  type DocumentMetadata,
  type DocumentStorage,
  type DownloadableStorageStatus,
} from "./DocumentStorage.js";
import { S3CompatibleDocumentStorage } from "./S3CompatibleDocumentStorage.js";
import {
  StorageReconciler,
  type StorageReconciliationReport,
  type StorageRetentionPolicy,
} from "./StorageReconciler.js";

interface VersionRow {
  readonly id: string;
  readonly case_id: string;
  readonly storage_key: string;
  readonly storage_status:
    | "ready"
    | "retained"
    | "pending"
    | "quarantined"
    | "inconsistent"
    | "deleted";
  readonly size_bytes: number;
  readonly sha256: string;
}

export type MigrationVersionResultStatus =
  | "migrated"
  | "already_verified"
  | "inconsistent";

export interface MigrationVersionResult {
  readonly versionId: string;
  readonly storageKey: string;
  readonly status: MigrationVersionResultStatus;
  readonly reason?: string;
}

export interface DocumentStorageMigrationOptions {
  readonly db: Database.Database;
  readonly source: DocumentStorage;
  readonly target: S3CompatibleDocumentStorage;
  readonly audit: ContractAuditService;
  readonly retentionPolicy: StorageRetentionPolicy;
  readonly now?: () => Date;
  readonly createId?: () => string;
  readonly processId?: string;
  /** Override for an application write gate; default uses BEGIN IMMEDIATE. */
  readonly withWritesPaused?: <T>(work: () => Promise<T>) => Promise<T>;
  /** Changes the active adapter configuration only after all versions verify. */
  readonly activate?: () => Promise<void> | void;
  /** Keeps the old filesystem available for rollback without allowing writes. */
  readonly setSourceReadOnly?: () => Promise<void> | void;
}

export interface DocumentStorageMigrationReport {
  readonly migrationId: string;
  readonly initialPass: readonly MigrationVersionResult[];
  readonly deltaPass: readonly MigrationVersionResult[];
  readonly reconciliation: StorageReconciliationReport;
  readonly activated: boolean;
  readonly sourceReadOnly: boolean;
  readonly consistent: boolean;
}

/**
 * Performs a resumable, key-preserving filesystem -> S3 migration. It never
 * changes domain rows except to block a version whose object cannot be
 * verified, and it never replaces a destination object.
 */
export class DocumentStorageMigration {
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly processId: string;
  private readonly withWritesPaused: <T>(work: () => Promise<T>) => Promise<T>;

  constructor(private readonly options: DocumentStorageMigrationOptions) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
    this.processId = options.processId ?? "document-storage-migration";
    this.withWritesPaused =
      options.withWritesPaused ??
      ((work) => withSqliteWritesPaused(options.db, work));
  }

  async migrate(): Promise<DocumentStorageMigrationReport> {
    const migrationId = this.createId();
    this.recordMigration(migrationId, "started", "success");
    const initialPass = await this.copyPass(migrationId, "inventory");
    let deltaPass: readonly MigrationVersionResult[] = [];
    let reconciliation: StorageReconciliationReport =
      emptyReconciliationReport();
    let activated = false;
    let sourceReadOnly = false;

    const finalization = async (): Promise<void> => {
      deltaPass = await this.copyPass(migrationId, "delta");
      const reconciler = new StorageReconciler(
        this.options.db,
        this.options.target,
        this.options.audit,
        this.options.retentionPolicy,
        { now: this.now, processId: this.processId },
      );
      reconciliation = await reconciler.reconcile();
      const allResults = [...initialPass, ...deltaPass];
      const consistent =
        allResults.every((result) => result.status !== "inconsistent") &&
        reconciliation.inconsistentVersions === 0;
      if (!consistent) {
        this.recordMigration(migrationId, "verification_failed", "failure");
        return;
      }
      if (this.options.activate) {
        await this.options.activate();
        activated = true;
      }
      if (activated) {
        if (this.options.setSourceReadOnly)
          await this.options.setSourceReadOnly();
        sourceReadOnly = Boolean(this.options.setSourceReadOnly);
        this.recordMigration(migrationId, "activated", "success");
      }
    };

    try {
      await this.withWritesPaused(finalization);
    } catch (error) {
      this.recordMigration(migrationId, "failed", "failure", error);
      throw error;
    }

    const consistent =
      [...initialPass, ...deltaPass].every(
        (result) => result.status !== "inconsistent",
      ) && reconciliation.inconsistentVersions === 0;
    return {
      migrationId,
      initialPass,
      deltaPass,
      reconciliation,
      activated,
      sourceReadOnly,
      consistent,
    };
  }

  private async copyPass(
    migrationId: string,
    phase: "inventory" | "delta",
  ): Promise<readonly MigrationVersionResult[]> {
    const versions = this.versions();
    const results: MigrationVersionResult[] = [];
    for (const version of versions) {
      const storageStatus = version.storage_status;
      if (!isDownloadableStorageStatus(storageStatus)) continue;
      const result = await this.copyVersion(
        migrationId,
        phase,
        version,
        storageStatus,
      );
      results.push(result);
    }
    return results;
  }

  private async copyVersion(
    migrationId: string,
    phase: "inventory" | "delta",
    version: VersionRow,
    storageStatus: DownloadableStorageStatus,
  ): Promise<MigrationVersionResult> {
    const expected: DocumentMetadata = {
      sizeBytes: version.size_bytes,
      sha256: version.sha256,
    };
    let sourceMetadata: DocumentMetadata | null;
    try {
      sourceMetadata = await this.options.source.stat(version.storage_key);
    } catch (error) {
      return this.inconsistent(
        migrationId,
        phase,
        version,
        "source_unavailable",
        error,
      );
    }
    if (!sourceMetadata)
      return this.inconsistent(migrationId, phase, version, "source_missing");
    if (!sameMetadata(sourceMetadata, expected)) {
      await this.options.source
        .quarantine(version.storage_key)
        .catch(() => undefined);
      return this.inconsistent(
        migrationId,
        phase,
        version,
        "source_metadata_divergence",
      );
    }

    try {
      const targetMetadata = await this.options.target.stat(
        version.storage_key,
      );
      if (targetMetadata) {
        if (sameMetadata(targetMetadata, expected)) {
          return this.verified(migrationId, phase, version, "already_verified");
        }
        await this.options.target
          .quarantine(version.storage_key)
          .catch(() => undefined);
        return this.inconsistent(
          migrationId,
          phase,
          version,
          "target_metadata_divergence",
        );
      }

      const published = await this.options.target.putAtKey(
        version.storage_key,
        await this.options.source.openRead(version.storage_key, storageStatus),
        expected,
      );
      if (!sameMetadata(published, expected)) {
        await this.options.target
          .quarantine(version.storage_key)
          .catch(() => undefined);
        return this.inconsistent(
          migrationId,
          phase,
          version,
          "target_verification_failed",
        );
      }
      return this.verified(migrationId, phase, version, "migrated");
    } catch (error) {
      const targetMetadata = await this.options.target
        .stat(version.storage_key)
        .catch(() => null);
      if (targetMetadata && sameMetadata(targetMetadata, expected)) {
        return this.verified(migrationId, phase, version, "already_verified");
      }
      if (targetMetadata)
        await this.options.target
          .quarantine(version.storage_key)
          .catch(() => undefined);
      return this.inconsistent(
        migrationId,
        phase,
        version,
        "target_copy_failed",
        error,
      );
    }
  }

  private verified(
    migrationId: string,
    phase: "inventory" | "delta",
    version: VersionRow,
    status: "migrated" | "already_verified",
  ): MigrationVersionResult {
    const result: MigrationVersionResult = {
      versionId: version.id,
      storageKey: version.storage_key,
      status,
    };
    this.options.audit.record({
      eventType: "migration_verified",
      result: "success",
      actor: { type: "system", id: this.processId },
      caseId: version.case_id,
      documentVersionId: version.id,
      metadata: {
        migration_id: migrationId,
        phase,
        storage_key: version.storage_key,
        status,
      },
    });
    return result;
  }

  private inconsistent(
    migrationId: string,
    phase: "inventory" | "delta",
    version: VersionRow,
    reason: string,
    error?: unknown,
  ): MigrationVersionResult {
    this.options.db
      .prepare(
        "UPDATE contract_document_versions SET storage_status = 'inconsistent', updated_at = ? WHERE id = ? AND storage_status IN ('ready', 'retained')",
      )
      .run(this.utcNow(), version.id);
    this.options.audit.record({
      eventType: "migration_verified",
      result: "failure",
      actor: { type: "system", id: this.processId },
      caseId: version.case_id,
      documentVersionId: version.id,
      metadata: {
        migration_id: migrationId,
        phase,
        storage_key: version.storage_key,
        reason,
      },
      errorCode: "migration_inconsistent",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Document migration verification failed",
    });
    return {
      versionId: version.id,
      storageKey: version.storage_key,
      status: "inconsistent",
      reason,
    };
  }

  private versions(): VersionRow[] {
    return this.options.db
      .prepare(
        "SELECT id, case_id, storage_key, storage_status, size_bytes, sha256 FROM contract_document_versions",
      )
      .all() as VersionRow[];
  }

  private recordMigration(
    migrationId: string,
    phase: string,
    result: "success" | "failure",
    error?: unknown,
  ): void {
    this.options.audit.record({
      eventType: "migration_verified",
      result,
      actor: { type: "system", id: this.processId },
      metadata: { migration_id: migrationId, phase },
      ...(error
        ? {
            errorCode: "migration_failed",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Document migration failed",
          }
        : {}),
    });
  }

  private utcNow(): string {
    const value = this.now();
    if (Number.isNaN(value.getTime()))
      throw new DocumentStorageError(
        "Migration clock returned an invalid date",
      );
    return value.toISOString();
  }
}

function isDownloadableStorageStatus(
  status: VersionRow["storage_status"],
): status is DownloadableStorageStatus {
  return status === "ready" || status === "retained";
}

function sameMetadata(
  left: DocumentMetadata,
  right: DocumentMetadata,
): boolean {
  return left.sizeBytes === right.sizeBytes && left.sha256 === right.sha256;
}

async function withSqliteWritesPaused<T>(
  db: Database.Database,
  work: () => Promise<T>,
): Promise<T> {
  if (db.inTransaction)
    throw new DocumentStorageError(
      "Migration cannot start inside an existing transaction",
    );
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = await work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function emptyReconciliationReport(): StorageReconciliationReport {
  return {
    temporariesDeleted: 0,
    orphanedObjectsQuarantined: 0,
    divergentObjectsQuarantined: 0,
    inconsistentVersions: 0,
    versionsRetained: 0,
    versionsDeleted: 0,
    quarantinedObjectsDeleted: 0,
  };
}
