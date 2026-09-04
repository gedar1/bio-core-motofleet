import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ContractAuditService } from "./ContractAuditService.js";
import type { CapacityGuard } from "./ContractDocumentRepository.js";
import type {
  DocumentMetadata,
  DocumentStorage,
  StoredDocumentEntry,
} from "./DocumentStorage.js";

const MANIFEST_FILE = "manifest.json";
const DATABASE_FILE = "database.sqlite";
const DATABASE_PARTIAL_FILE = "database.sqlite.partial";
const OBJECTS_DIRECTORY = "objects";
const QUARANTINE_DIRECTORY = "quarantine";
const STORAGE_KEY_PATTERN = /^doc_[a-f0-9]{64}$/;
const DEFAULT_GROWTH_MARGIN_RATIO = 0.1;
const DOWNLOADABLE_STATUSES = new Set(["ready", "retained"]);

type DownloadableStatus = "ready" | "retained";

export interface BackupCapacityEstimate {
  readonly objectBytes: number;
  readonly snapshotTemporaryBytes: number;
  readonly growthMarginBytes: number;
  readonly requiredBytes: number;
}

export interface BackupVersionEntry {
  readonly storage_key: string;
  readonly version_id: string;
  readonly version: number;
  readonly case_id: string;
  readonly kind: "original" | "signed";
  readonly state: DownloadableStatus;
  readonly size_bytes: number;
  readonly sha256: string;
  readonly relations: {
    readonly contract_id: string | null;
    readonly rider_id: string | null;
    readonly motorcycle_id: string | null;
  };
  readonly metadata: {
    readonly original_filename: string;
    readonly mime_type: string;
    readonly uploaded_by_type: string;
    readonly uploaded_by_id: string | null;
    readonly created_at: string;
    readonly uploaded_at: string;
    readonly updated_at: string;
  };
}

export interface BackupObjectEntry {
  readonly storage_key: string;
  readonly size_bytes: number;
  readonly sha256: string;
  readonly created_at: string;
}

export interface BackupManifest {
  readonly manifest_version: 1;
  readonly backup_id: string;
  readonly created_at: string;
  readonly closed_at: string;
  readonly consistency: "writes_paused" | "sqlite_snapshot";
  readonly database: {
    readonly file: typeof DATABASE_FILE;
    readonly size_bytes: number;
    readonly sha256: string;
  };
  readonly repository: {
    readonly objects_dir: typeof OBJECTS_DIRECTORY;
    readonly quarantine_dir: typeof QUARANTINE_DIRECTORY;
    readonly object_count: number;
    readonly object_bytes: number;
  };
  readonly capacity: BackupCapacityEstimate;
  readonly versions: readonly BackupVersionEntry[];
  readonly unreferenced_objects: readonly BackupObjectEntry[];
  readonly audit: {
    readonly backup_started_id: string;
    readonly backup_verified_id: string;
    readonly version_verified_ids: Readonly<Record<string, string>>;
  };
}

export interface BackupRestoreIncident {
  readonly operation: "backup" | "restore";
  readonly backupId: string;
  readonly restoreId?: string;
  readonly versionId?: string;
  readonly caseId?: string;
  readonly storageKey?: string;
  readonly reason: string;
  readonly adminId?: string;
}

export interface RestoreActivationContext {
  readonly backupId: string;
  readonly restoreId: string;
  readonly restoreRoot: string;
  readonly databasePath: string;
  readonly objectsPath: string;
}

export interface RestoreOptions {
  /** A fresh, isolated directory. Existing non-empty directories are rejected. */
  readonly restoreRoot?: string;
  /** Called only after every version has been checked and the isolated DB is closed. */
  readonly activate?: (
    context: RestoreActivationContext,
  ) => Promise<void> | void;
  readonly notifyAdmin?: (
    incident: BackupRestoreIncident,
  ) => Promise<void> | void;
  readonly adminId?: string;
}

export interface RestoreReport {
  readonly backupId: string;
  readonly restoreId: string;
  readonly restoreRoot: string;
  readonly databasePath: string;
  readonly objectsPath: string;
  readonly restoredVersions: number;
  readonly inconsistentVersions: number;
  readonly notificationsSent: number;
  readonly notificationsFailed: number;
  readonly activated: boolean;
}

export interface BackupCoordinatorOptions {
  readonly capacityGuard?: CapacityGuard;
  /** Fixed bytes reserved for expected growth. */
  readonly growthMarginBytes?: number;
  /** Used only when growthMarginBytes is omitted; defaults to 10%. */
  readonly growthMarginRatio?: number;
  /** Override for tests or an external capacity estimator. */
  readonly snapshotTemporaryBytes?: number;
  readonly now?: () => Date;
  readonly createId?: () => string;
  readonly processId?: string;
  /** Application write gate. Without it, SQLite's online snapshot is used. */
  readonly withWritesPaused?: <T>(work: () => Promise<T>) => Promise<T>;
  readonly notifyAdmin?: (
    incident: BackupRestoreIncident,
  ) => Promise<void> | void;
  readonly adminId?: string;
}

interface VersionRow {
  readonly id: string;
  readonly case_id: string;
  readonly version_number: number;
  readonly kind: "original" | "signed";
  readonly storage_key: string;
  readonly storage_status: string;
  readonly original_filename: string;
  readonly mime_type: string;
  readonly size_bytes: number;
  readonly sha256: string;
  readonly uploaded_by_type: string;
  readonly uploaded_by_id: string | null;
  readonly created_at: string;
  readonly uploaded_at: string;
  readonly updated_at: string;
  readonly contract_id: string | null;
  readonly rider_id: string | null;
  readonly motorcycle_id: string | null;
}

interface RestoreVersionRow {
  readonly id: string;
  readonly case_id: string;
  readonly version_number: number;
  readonly kind: "original" | "signed";
  readonly storage_key: string;
  readonly storage_status: string;
  readonly size_bytes: number;
  readonly sha256: string;
}

interface VersionIssue {
  readonly version: BackupVersionEntry | null;
  readonly row: RestoreVersionRow | null;
  readonly reason: string;
}

interface BackupInventory {
  readonly readyObjects: readonly StoredDocumentEntry[];
  readonly quarantinedObjects: readonly StoredDocumentEntry[];
  readonly objectBytes: number;
}

export class BackupCoordinatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupCoordinatorError";
  }
}

export class BackupIntegrityError extends BackupCoordinatorError {
  constructor(message: string) {
    super(message);
    this.name = "BackupIntegrityError";
  }
}

/**
 * Coordinates a SQLite online backup with the logical document repository.
 * The coordinator never replaces an object: backup destinations and restore
 * areas are fresh, isolated directories and every copy uses exclusive create.
 */
export class BackupCoordinator {
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly processId: string;
  private readonly withWritesPaused: <T>(work: () => Promise<T>) => Promise<T>;
  private readonly growthMarginBytes: number;
  private readonly growthMarginRatio: number;
  private readonly notifyAdmin?: (
    incident: BackupRestoreIncident,
  ) => Promise<void> | void;
  private readonly adminId?: string;

  constructor(
    private readonly db: Database.Database,
    private readonly storage: DocumentStorage,
    private readonly audit: ContractAuditService,
    options: BackupCoordinatorOptions | CapacityGuard = {},
  ) {
    const normalized = isCapacityGuard(options)
      ? { capacityGuard: options }
      : options;
    this.capacityGuard = normalized.capacityGuard;
    this.growthMarginBytes = normalized.growthMarginBytes ?? -1;
    this.growthMarginRatio =
      normalized.growthMarginRatio ?? DEFAULT_GROWTH_MARGIN_RATIO;
    if (
      this.growthMarginBytes !== -1 &&
      (!Number.isSafeInteger(this.growthMarginBytes) ||
        this.growthMarginBytes < 0)
    ) {
      throw new BackupCoordinatorError("Backup growth margin is invalid");
    }
    if (
      !Number.isFinite(this.growthMarginRatio) ||
      this.growthMarginRatio < 0 ||
      this.growthMarginRatio > 10
    ) {
      throw new BackupCoordinatorError("Backup growth margin ratio is invalid");
    }
    this.now = normalized.now ?? (() => new Date());
    this.createId = normalized.createId ?? randomUUID;
    this.processId = normalized.processId ?? "backup-coordinator";
    this.snapshotTemporaryBytes = normalized.snapshotTemporaryBytes;
    this.withWritesPaused = normalized.withWritesPaused ?? defaultWriteWindow;
    this.notifyAdmin = normalized.notifyAdmin;
    this.adminId = normalized.adminId;
  }

  private readonly capacityGuard?: CapacityGuard;

  /** Computes objects + temporary snapshot + configured growth margin. */
  static calculateCapacity(
    objectBytes: number,
    snapshotTemporaryBytes: number,
    growthMarginBytes: number,
  ): BackupCapacityEstimate {
    for (const value of [
      objectBytes,
      snapshotTemporaryBytes,
      growthMarginBytes,
    ]) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new BackupCoordinatorError("Backup capacity estimate is invalid");
      }
    }
    const requiredBytes =
      objectBytes + snapshotTemporaryBytes + growthMarginBytes;
    if (!Number.isSafeInteger(requiredBytes)) {
      throw new BackupCoordinatorError(
        "Backup capacity estimate exceeds safe integer range",
      );
    }
    return {
      objectBytes,
      snapshotTemporaryBytes,
      growthMarginBytes,
      requiredBytes,
    };
  }

  async estimateCapacity(): Promise<BackupCapacityEstimate> {
    const inventory = await this.inventory();
    const snapshotTemporaryBytes = await this.snapshotSizeEstimate();
    const growthMarginBytes =
      this.growthMarginBytes >= 0
        ? this.growthMarginBytes
        : Math.ceil(
            (inventory.objectBytes + snapshotTemporaryBytes) *
              this.growthMarginRatio,
          );
    return BackupCoordinator.calculateCapacity(
      inventory.objectBytes,
      snapshotTemporaryBytes,
      growthMarginBytes,
    );
  }

  /** Creates and closes a coordinated backup at a new destination directory. */
  async createBackup(destinationDirectory: string): Promise<BackupManifest> {
    const destination = path.resolve(destinationDirectory);
    const capacity = await this.estimateCapacity();
    await this.capacityGuard?.assertCanGuaranteeCapacity(
      capacity.requiredBytes,
    );

    let createdDestination = false;
    const run = async (): Promise<BackupManifest> => {
      const backupId = this.createId();
      const startedAt = this.utcNow();
      let backupStartedId = "";
      try {
        await fs.mkdir(destination, { recursive: false });
        createdDestination = true;
        await fs.mkdir(path.join(destination, OBJECTS_DIRECTORY), {
          mode: 0o700,
        });
        await fs.mkdir(path.join(destination, QUARANTINE_DIRECTORY), {
          mode: 0o700,
        });

        const started = this.audit.record({
          eventType: "backup_started",
          result: "success",
          actor: this.actor(),
          metadata: {
            backup_id: backupId,
            consistency:
              this.withWritesPaused === defaultWriteWindow
                ? "sqlite_snapshot"
                : "writes_paused",
            required_bytes: capacity.requiredBytes,
          },
        });
        backupStartedId = started.id;

        const databasePartialPath = path.join(
          destination,
          DATABASE_PARTIAL_FILE,
        );
        await this.db.backup(databasePartialPath);
        const databasePath = path.join(destination, DATABASE_FILE);
        await fs.rename(databasePartialPath, databasePath);

        const snapshotDb = new Database(databasePath, {
          readonly: true,
          fileMustExist: true,
        });
        let snapshotVersions: VersionRow[];
        try {
          snapshotVersions = readVersionRows(snapshotDb);
        } finally {
          snapshotDb.close();
        }

        const expectedVersions = snapshotVersions.filter((version) =>
          isDownloadableStatus(version.storage_status),
        );
        assertUniqueVersionReferences(expectedVersions);

        const copiedKeys = new Set<string>();
        const versionEntries: BackupVersionEntry[] = [];
        const versionVerifiedIds: Record<string, string> = {};

        for (const version of expectedVersions) {
          try {
            assertStorageKey(version.storage_key);
            const sourceMetadata = await this.storage.stat(version.storage_key);
            if (!sourceMetadata)
              throw new BackupIntegrityError(
                "Referenced document object is missing",
              );
            assertMetadataMatches(version, sourceMetadata);
            await copyStorageObject(
              this.storage,
              version.storage_key,
              version.storage_status as DownloadableStatus,
              path.join(destination, OBJECTS_DIRECTORY, version.storage_key),
            );
            copiedKeys.add(version.storage_key);
            const copiedMetadata = await fileMetadata(
              path.join(destination, OBJECTS_DIRECTORY, version.storage_key),
            );
            assertMetadataMatches(version, copiedMetadata);
            const entry = toManifestVersion(version);
            versionEntries.push(entry);
            const verified = this.audit.record({
              eventType: "backup_verified",
              result: "success",
              actor: this.actor(),
              caseId: version.case_id,
              documentVersionId: version.id,
              metadata: {
                backup_id: backupId,
                storage_key: version.storage_key,
                version: version.version_number,
                size_bytes: version.size_bytes,
                sha256: version.sha256,
              },
            });
            versionVerifiedIds[version.id] = verified.id;
          } catch (error) {
            this.recordBackupVersionFailure(backupId, version, error);
            throw error;
          }
        }

        const inventory = await this.inventory();
        for (const object of inventory.readyObjects) {
          if (copiedKeys.has(object.storageKey)) continue;
          assertStorageKey(object.storageKey);
          await copyStorageObject(
            this.storage,
            object.storageKey,
            "ready",
            path.join(destination, OBJECTS_DIRECTORY, object.storageKey),
          );
          copiedKeys.add(object.storageKey);
        }

        // Quarantined objects are intentionally inventory-only: DocumentStorage
        // does not expose them for reads, so the coordinator never bypasses the
        // storage adapter or invents a physical path to copy them.
        const unreferencedObjects = inventory.readyObjects
          .filter(
            (object) =>
              !expectedVersions.some(
                (version) => version.storage_key === object.storageKey,
              ),
          )
          .map(toManifestObject);

        const liveVersions = readVersionRows(this.db);
        assertSameVersionSnapshot(expectedVersions, liveVersions);

        const verified = this.audit.record({
          eventType: "backup_verified",
          result: "success",
          actor: this.actor(),
          metadata: {
            backup_id: backupId,
            versions: versionEntries.length,
            objects: copiedKeys.size,
          },
        });

        // Recreate the SQLite snapshot after all backup audit events have been
        // written. The final artifact therefore contains backup_started,
        // per-version verification, and the global backup_verified event.
        await fs.rm(databasePath, { force: true });
        await this.db.backup(databasePartialPath);
        await fs.rename(databasePartialPath, databasePath);
        const databaseMetadata = await fileMetadata(databasePath);
        const finalSnapshotDb = new Database(databasePath, {
          readonly: true,
          fileMustExist: true,
        });
        try {
          assertSameVersionSnapshot(
            expectedVersions,
            readVersionRows(finalSnapshotDb),
          );
        } finally {
          finalSnapshotDb.close();
        }

        const closedAt = this.utcNow();
        const manifest: BackupManifest = {
          manifest_version: 1,
          backup_id: backupId,
          created_at: startedAt,
          closed_at: closedAt,
          consistency:
            this.withWritesPaused === defaultWriteWindow
              ? "sqlite_snapshot"
              : "writes_paused",
          database: {
            file: DATABASE_FILE,
            size_bytes: databaseMetadata.sizeBytes,
            sha256: databaseMetadata.sha256,
          },
          repository: {
            objects_dir: OBJECTS_DIRECTORY,
            quarantine_dir: QUARANTINE_DIRECTORY,
            object_count: copiedKeys.size,
            object_bytes: inventory.objectBytes,
          },
          capacity,
          versions: versionEntries,
          unreferenced_objects: unreferencedObjects,
          audit: {
            backup_started_id: backupStartedId,
            backup_verified_id: verified.id,
            version_verified_ids: versionVerifiedIds,
          },
        };
        await writeClosedManifest(destination, manifest);
        return manifest;
      } catch (error) {
        if (backupStartedId) {
          this.recordBackupFailure(backupId, error);
        }
        throw normalizeBackupError(error);
      }
    };

    try {
      return await this.withWritesPaused(run);
    } catch (error) {
      if (createdDestination) {
        await fs
          .rm(destination, { recursive: true, force: true })
          .catch(() => undefined);
      }
      throw error;
    }
  }

  /** Alias useful to operational callers that name the operation `backup`. */
  async backup(destinationDirectory: string): Promise<BackupManifest> {
    return this.createBackup(destinationDirectory);
  }

  /** Restores into an isolated area and activates it only after full verification. */
  async restoreBackup(
    backupDirectory: string,
    options: RestoreOptions = {},
  ): Promise<RestoreReport> {
    const backupRoot = path.resolve(backupDirectory);
    const manifest = await readClosedManifest(backupRoot);
    await assertBackupComponents(backupRoot, manifest);
    const restoreId = this.createId();
    const restoreRoot = options.restoreRoot
      ? path.resolve(options.restoreRoot)
      : await fs.mkdtemp(
          path.join(os.tmpdir(), `motofleet-restore-${restoreId}-`),
        );
    const databasePath = path.join(restoreRoot, DATABASE_FILE);
    const objectsPath = path.join(restoreRoot, OBJECTS_DIRECTORY);
    const incidentNotifier = options.notifyAdmin ?? this.notifyAdmin;
    const adminId = options.adminId ?? this.adminId;
    let restoreStartedId = "";
    let restoredDb: Database.Database | undefined;
    let notificationsSent = 0;
    let notificationsFailed = 0;

    try {
      await prepareEmptyDirectory(restoreRoot);
      const started = this.audit.record({
        eventType: "restore_started",
        result: "success",
        actor: this.actor(),
        metadata: { backup_id: manifest.backup_id, restore_id: restoreId },
      });
      restoreStartedId = started.id;

      const sourceDatabasePath = safeManifestPath(
        backupRoot,
        manifest.database.file,
      );
      await copyFileExclusive(sourceDatabasePath, databasePath);
      const restoredDatabaseMetadata = await fileMetadata(databasePath);
      if (
        restoredDatabaseMetadata.sizeBytes !== manifest.database.size_bytes ||
        restoredDatabaseMetadata.sha256 !== manifest.database.sha256
      ) {
        throw new BackupIntegrityError(
          "SQLite snapshot integrity check failed",
        );
      }

      await fs.mkdir(objectsPath, { mode: 0o700 });
      await fs.mkdir(path.join(restoreRoot, QUARANTINE_DIRECTORY), {
        mode: 0o700,
      });
      restoredDb = new Database(databasePath, { fileMustExist: true });
      restoredDb.pragma("foreign_keys = ON");
      const restoredAudit = new ContractAuditService(restoredDb, {
        now: this.now,
        createId: this.createId,
      });
      restoredAudit.record({
        eventType: "restore_started",
        result: "success",
        actor: this.actor(),
        metadata: { backup_id: manifest.backup_id, restore_id: restoreId },
      });

      const dbVersions = readRestoreVersionRows(restoredDb);
      const versionsById = new Map(
        dbVersions.map((version) => [version.id, version]),
      );
      const manifestByKey = groupManifestEntries(
        manifest.versions,
        (entry) => entry.storage_key,
      );
      const manifestByVersion = groupManifestEntries(
        manifest.versions,
        (entry) => entry.version_id,
      );
      const issues: VersionIssue[] = [];
      const restoredVersionIds = new Set<string>();

      for (const entry of manifest.versions) {
        const row = versionsById.get(entry.version_id) ?? null;
        const duplicateKey =
          (manifestByKey.get(entry.storage_key)?.length ?? 0) > 1;
        const duplicateVersion =
          (manifestByVersion.get(entry.version_id)?.length ?? 0) > 1;
        const issueReason = duplicateKey
          ? "duplicate_storage_key"
          : duplicateVersion
            ? "duplicate_version_reference"
            : validateManifestVersion(entry, row);
        if (issueReason) {
          issues.push({ version: entry, row, reason: issueReason });
          continue;
        }

        const sourceObjectPath = safeManifestObjectPath(
          backupRoot,
          manifest.repository.objects_dir,
          entry.storage_key,
        );
        const destinationObjectPath = safeManifestObjectPath(
          restoreRoot,
          OBJECTS_DIRECTORY,
          entry.storage_key,
        );
        try {
          await copyFileExclusive(sourceObjectPath, destinationObjectPath);
          const copiedMetadata = await fileMetadata(destinationObjectPath);
          if (
            copiedMetadata.sizeBytes !== entry.size_bytes ||
            copiedMetadata.sha256 !== entry.sha256
          ) {
            throw new BackupIntegrityError(
              "Restored document metadata diverges from manifest",
            );
          }
          restoredVersionIds.add(entry.version_id);
          restoredDb
            .prepare(
              "UPDATE contract_document_versions SET storage_status = ? WHERE id = ? AND storage_status IN ('ready', 'retained')",
            )
            .run(entry.state, entry.version_id);
          this.recordRestoreVersion(
            this.audit,
            "restore_verified",
            manifest.backup_id,
            restoreId,
            entry,
            "success",
          );
          restoredAudit.record({
            eventType: "restore_verified",
            result: "success",
            actor: this.actor(),
            caseId: entry.case_id,
            documentVersionId: entry.version_id,
            metadata: {
              backup_id: manifest.backup_id,
              restore_id: restoreId,
              storage_key: entry.storage_key,
              size_bytes: entry.size_bytes,
              sha256: entry.sha256,
            },
          });
        } catch (error) {
          await fs.unlink(destinationObjectPath).catch(() => undefined);
          issues.push({ version: entry, row, reason: restoreReason(error) });
        }
      }

      for (const row of dbVersions.filter((candidate) =>
        isDownloadableStatus(candidate.storage_status),
      )) {
        if (restoredVersionIds.has(row.id)) continue;
        if (issues.some((issue) => issue.row?.id === row.id)) continue;
        issues.push({
          version: null,
          row,
          reason: "missing_manifest_reference",
        });
      }

      const duplicateDbKeys = duplicateRowsByKey(dbVersions);
      for (const row of duplicateDbKeys) {
        if (!issues.some((issue) => issue.row?.id === row.id)) {
          issues.push({
            version: null,
            row,
            reason: "duplicate_database_storage_key",
          });
        }
      }

      for (const issue of issues) {
        const row = issue.row;
        if (row) {
          restoredDb
            .prepare(
              "UPDATE contract_document_versions SET storage_status = 'inconsistent', updated_at = ? WHERE id = ? AND storage_status IN ('ready', 'retained')",
            )
            .run(this.utcNow(), row.id);
        }
        const entry = issue.version;
        this.recordRestoreVersion(
          this.audit,
          "restore_inconsistent",
          manifest.backup_id,
          restoreId,
          entry,
          "failure",
          issue.reason,
          row,
        );
        if (row && entry) {
          restoredAudit.record({
            eventType: "restore_inconsistent",
            result: "failure",
            actor: this.actor(),
            caseId: row.case_id,
            documentVersionId: row.id,
            metadata: {
              backup_id: manifest.backup_id,
              restore_id: restoreId,
              storage_key: entry.storage_key,
              reason: issue.reason,
            },
            errorCode: "restore_inconsistent",
            errorMessage:
              "Restored document object is absent or does not match its metadata",
          });
        }

        const incident: BackupRestoreIncident = {
          operation: "restore",
          backupId: manifest.backup_id,
          restoreId,
          versionId: row?.id ?? entry?.version_id,
          caseId: row?.case_id ?? entry?.case_id,
          storageKey: row?.storage_key ?? entry?.storage_key,
          reason: issue.reason,
          adminId,
        };
        if (incidentNotifier) {
          try {
            await incidentNotifier(incident);
            notificationsSent += 1;
          } catch {
            notificationsFailed += 1;
          }
        }
      }

      restoredDb.close();
      restoredDb = undefined;

      const verificationSucceeded = issues.length === 0;
      const verified = this.audit.record({
        eventType: "restore_verified",
        result: verificationSucceeded ? "success" : "failure",
        actor: this.actor(),
        metadata: {
          backup_id: manifest.backup_id,
          restore_id: restoreId,
          restored_versions: restoredVersionIds.size,
          inconsistent_versions: issues.length,
          restore_started_id: restoreStartedId,
        },
        ...(verificationSucceeded
          ? {}
          : {
              errorCode: "restore_inconsistent",
              errorMessage:
                "One or more restored document versions are inconsistent",
            }),
      });

      let activated = false;
      if (verificationSucceeded && options.activate) {
        await options.activate({
          backupId: manifest.backup_id,
          restoreId,
          restoreRoot,
          databasePath,
          objectsPath,
        });
        activated = true;
      }

      // The global event is deliberately written after all version checks and
      // before activation; an activation callback can therefore never observe
      // an unverified repository.
      void verified;
      return {
        backupId: manifest.backup_id,
        restoreId,
        restoreRoot,
        databasePath,
        objectsPath,
        restoredVersions: restoredVersionIds.size,
        inconsistentVersions: issues.length,
        notificationsSent,
        notificationsFailed,
        activated,
      };
    } catch (error) {
      restoredDb?.close();
      this.audit.record({
        eventType: "restore_verified",
        result: "failure",
        actor: this.actor(),
        metadata: {
          backup_id: manifest.backup_id,
          restore_id: restoreId,
          restore_started_id: restoreStartedId || undefined,
        },
        errorCode: "restore_failed",
        errorMessage: error instanceof Error ? error.message : "Restore failed",
      });
      throw normalizeBackupError(error);
    }
  }

  /** Alias useful to operational callers that name the operation `restore`. */
  async restore(
    backupDirectory: string,
    options: RestoreOptions = {},
  ): Promise<RestoreReport> {
    return this.restoreBackup(backupDirectory, options);
  }

  private async inventory(): Promise<BackupInventory> {
    const [readyObjects, quarantinedObjects] = await Promise.all([
      this.storage.enumerate("ready"),
      this.storage.enumerate("quarantined"),
    ]);
    assertUniqueObjects([...readyObjects, ...quarantinedObjects]);
    const objectBytes = readyObjects.reduce(
      (total, object) => total + object.sizeBytes,
      0,
    );
    if (!Number.isSafeInteger(objectBytes)) {
      throw new BackupCoordinatorError(
        "Repository inventory exceeds safe integer range",
      );
    }
    return { readyObjects, quarantinedObjects, objectBytes };
  }

  private async snapshotSizeEstimate(): Promise<number> {
    const configured = this.snapshotTemporaryBytes;
    if (configured !== undefined) {
      if (!Number.isSafeInteger(configured) || configured < 0) {
        throw new BackupCoordinatorError("Snapshot size estimate is invalid");
      }
      return configured;
    }
    if (!this.db.memory) {
      try {
        const details = await fs.stat(this.db.name);
        if (details.isFile() && Number.isSafeInteger(details.size))
          return details.size;
      } catch {
        // Fall back to SQLite's in-memory serialization below.
      }
    }
    return this.db.serialize().byteLength;
  }

  private readonly snapshotTemporaryBytes?: number;

  private utcNow(): string {
    const date = this.now();
    if (Number.isNaN(date.getTime()))
      throw new BackupCoordinatorError("Backup clock returned an invalid date");
    return date.toISOString();
  }

  private actor(): { type: "system"; id: string } {
    return { type: "system", id: this.processId };
  }

  private recordBackupVersionFailure(
    backupId: string,
    version: VersionRow,
    error: unknown,
  ): void {
    this.audit.record({
      eventType: "backup_verified",
      result: "failure",
      actor: this.actor(),
      caseId: version.case_id,
      documentVersionId: version.id,
      metadata: {
        backup_id: backupId,
        storage_key: version.storage_key,
        version: version.version_number,
      },
      errorCode: "backup_inconsistent",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Backup version verification failed",
    });
  }

  private recordBackupFailure(backupId: string, error: unknown): void {
    this.audit.record({
      eventType: "backup_verified",
      result: "failure",
      actor: this.actor(),
      metadata: {
        backup_id: backupId,
        operation: "backup",
      },
      errorCode: "backup_failed",
      errorMessage: error instanceof Error ? error.message : "Backup failed",
    });
  }

  private recordRestoreVersion(
    audit: ContractAuditService,
    eventType: "restore_verified" | "restore_inconsistent",
    backupId: string,
    restoreId: string,
    entry: BackupVersionEntry | null,
    result: "success" | "failure",
    reason?: string,
    row?: RestoreVersionRow | null,
  ): void {
    const versionId = row?.id ?? entry?.version_id;
    const caseId = row?.case_id ?? entry?.case_id;
    audit.record({
      eventType,
      result,
      actor: this.actor(),
      caseId,
      documentVersionId: versionId,
      metadata: {
        backup_id: backupId,
        restore_id: restoreId,
        ...(entry
          ? { storage_key: entry.storage_key, version: entry.version }
          : {}),
        ...(reason ? { reason } : {}),
      },
      ...(result === "failure"
        ? {
            errorCode: "restore_inconsistent",
            errorMessage:
              "Restored document object is absent or does not match its metadata",
          }
        : {}),
    });
  }
}

function isCapacityGuard(
  value: BackupCoordinatorOptions | CapacityGuard,
): value is CapacityGuard {
  return "assertCanGuaranteeCapacity" in value;
}

function isDownloadableStatus(status: string): status is DownloadableStatus {
  return DOWNLOADABLE_STATUSES.has(status);
}

function assertStorageKey(storageKey: string): void {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new BackupIntegrityError("Document storage key is invalid");
  }
}

function assertMetadataMatches(
  version: Pick<VersionRow, "size_bytes" | "sha256">,
  metadata: DocumentMetadata,
): void {
  if (
    version.size_bytes !== metadata.sizeBytes ||
    version.sha256 !== metadata.sha256
  ) {
    throw new BackupIntegrityError(
      "Document object metadata diverges from SQLite",
    );
  }
}

function assertUniqueVersionReferences(versions: readonly VersionRow[]): void {
  const counts = new Map<string, number>();
  for (const version of versions) {
    counts.set(version.storage_key, (counts.get(version.storage_key) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count !== 1)) {
    throw new BackupIntegrityError(
      "SQLite snapshot contains duplicate document storage references",
    );
  }
}

function assertUniqueObjects(objects: readonly StoredDocumentEntry[]): void {
  const keys = new Set<string>();
  for (const object of objects) {
    assertStorageKey(object.storageKey);
    if (keys.has(object.storageKey)) {
      throw new BackupIntegrityError(
        "Document repository contains a duplicate storage key",
      );
    }
    keys.add(object.storageKey);
  }
}

function toManifestVersion(version: VersionRow): BackupVersionEntry {
  return {
    storage_key: version.storage_key,
    version_id: version.id,
    version: version.version_number,
    case_id: version.case_id,
    kind: version.kind,
    state: version.storage_status as DownloadableStatus,
    size_bytes: version.size_bytes,
    sha256: version.sha256,
    relations: {
      contract_id: version.contract_id,
      rider_id: version.rider_id,
      motorcycle_id: version.motorcycle_id,
    },
    metadata: {
      original_filename: version.original_filename,
      mime_type: version.mime_type,
      uploaded_by_type: version.uploaded_by_type,
      uploaded_by_id: version.uploaded_by_id,
      created_at: version.created_at,
      uploaded_at: version.uploaded_at,
      updated_at: version.updated_at,
    },
  };
}

function toManifestObject(object: StoredDocumentEntry): BackupObjectEntry {
  return {
    storage_key: object.storageKey,
    size_bytes: object.sizeBytes,
    sha256: object.sha256,
    created_at: object.createdAt.toISOString(),
  };
}

function readVersionRows(database: Database.Database): VersionRow[] {
  return database
    .prepare(
      `SELECT v.id, v.case_id, v.version_number, v.kind, v.storage_key,
              v.storage_status, v.original_filename, v.mime_type, v.size_bytes,
              v.sha256, v.uploaded_by_type, v.uploaded_by_id, v.created_at,
              v.uploaded_at, v.updated_at, c.contract_id, c.rider_id,
              c.motorcycle_id
         FROM contract_document_versions v
         LEFT JOIN contract_signature_cases c ON c.id = v.case_id
        ORDER BY v.case_id, v.version_number`,
    )
    .all() as VersionRow[];
}

function readRestoreVersionRows(
  database: Database.Database,
): RestoreVersionRow[] {
  return database
    .prepare(
      `SELECT id, case_id, version_number, kind, storage_key, storage_status,
              size_bytes, sha256
         FROM contract_document_versions`,
    )
    .all() as RestoreVersionRow[];
}

function assertSameVersionSnapshot(
  expected: readonly VersionRow[],
  actual: readonly VersionRow[],
): void {
  const expectedFingerprint = fingerprintVersions(
    expected.filter((version) => isDownloadableStatus(version.storage_status)),
  );
  const actualFingerprint = fingerprintVersions(
    actual.filter((version) => isDownloadableStatus(version.storage_status)),
  );
  if (expectedFingerprint !== actualFingerprint) {
    throw new BackupIntegrityError(
      "SQLite references changed while the backup was being captured",
    );
  }
}

function fingerprintVersions(versions: readonly VersionRow[]): string {
  return JSON.stringify(
    versions.map((version) => [
      version.id,
      version.case_id,
      version.version_number,
      version.storage_key,
      version.storage_status,
      version.size_bytes,
      version.sha256,
    ]),
  );
}

function validateManifestVersion(
  entry: BackupVersionEntry,
  row: RestoreVersionRow | null,
): string | null {
  try {
    assertStorageKey(entry.storage_key);
  } catch {
    return "invalid_storage_key";
  }
  if (!row) return "missing_database_version";
  if (
    row.storage_key !== entry.storage_key ||
    row.version_number !== entry.version ||
    row.case_id !== entry.case_id ||
    row.kind !== entry.kind ||
    row.size_bytes !== entry.size_bytes ||
    row.sha256 !== entry.sha256 ||
    !isDownloadableStatus(row.storage_status)
  ) {
    return "manifest_metadata_divergence";
  }
  return null;
}

function duplicateRowsByKey(
  rows: readonly RestoreVersionRow[],
): RestoreVersionRow[] {
  const groups = new Map<string, RestoreVersionRow[]>();
  for (const row of rows)
    groups.set(row.storage_key, [...(groups.get(row.storage_key) ?? []), row]);
  return [...groups.values()].filter((group) => group.length > 1).flat();
}

function groupManifestEntries<T>(
  entries: readonly BackupVersionEntry[],
  key: (entry: BackupVersionEntry) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const group = groups.get(key(entry)) ?? [];
    group.push(entry as unknown as T);
    groups.set(key(entry), group);
  }
  return groups;
}

async function copyStorageObject(
  storage: DocumentStorage,
  storageKey: string,
  status: DownloadableStatus,
  destination: string,
): Promise<DocumentMetadata> {
  const source = await storage.openRead(storageKey, status);
  return copyReadableExclusive(source, destination);
}

async function copyReadableExclusive(
  source: AsyncIterable<Uint8Array>,
  destination: string,
): Promise<DocumentMetadata> {
  const handle = await fs.open(destination, "wx", 0o600);
  const hash = createHash("sha256");
  let sizeBytes = 0;
  try {
    for await (const chunk of source) {
      const bytes = Buffer.from(chunk);
      sizeBytes += bytes.length;
      hash.update(bytes);
      await handle.write(bytes);
    }
    await handle.sync();
    return { sizeBytes, sha256: hash.digest("hex") };
  } catch (error) {
    await fs.unlink(destination).catch(() => undefined);
    throw error;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

async function copyFileExclusive(
  source: string,
  destination: string,
): Promise<void> {
  const sourceHandle = await fs.open(source, "r");
  const destinationHandle = await fs.open(destination, "wx", 0o600);
  try {
    await sourceHandle
      .readFile()
      .then((contents) => destinationHandle.write(contents));
    await destinationHandle.sync();
  } catch (error) {
    await fs.unlink(destination).catch(() => undefined);
    throw error;
  } finally {
    await sourceHandle.close().catch(() => undefined);
    await destinationHandle.close().catch(() => undefined);
  }
}

async function fileMetadata(filePath: string): Promise<DocumentMetadata> {
  const details = await fs.stat(filePath);
  if (!details.isFile())
    throw new BackupIntegrityError("Backup entry is not a regular file");
  const stream = createReadStream(filePath);
  const hash = createHash("sha256");
  let sizeBytes = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    sizeBytes += bytes.length;
    hash.update(bytes);
  }
  return { sizeBytes, sha256: hash.digest("hex") };
}

async function writeClosedManifest(
  destination: string,
  manifest: BackupManifest,
): Promise<void> {
  const partial = path.join(destination, `${MANIFEST_FILE}.partial`);
  await fs.writeFile(partial, JSON.stringify(manifest, null, 2), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await fs.rename(partial, path.join(destination, MANIFEST_FILE));
}

async function readClosedManifest(root: string): Promise<BackupManifest> {
  const manifestPath = safeManifestPath(root, MANIFEST_FILE);
  const raw = await fs.readFile(manifestPath, "utf8");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new BackupIntegrityError("Backup manifest is invalid");
  }
  if (
    !isRecord(value) ||
    value.manifest_version !== 1 ||
    typeof value.backup_id !== "string" ||
    typeof value.closed_at !== "string" ||
    !isRecord(value.database) ||
    !isRecord(value.repository) ||
    !isRecord(value.capacity) ||
    !Array.isArray(value.versions) ||
    !isRecord(value.audit)
  ) {
    throw new BackupIntegrityError("Backup manifest is incomplete");
  }
  if (
    value.database.file !== DATABASE_FILE ||
    value.repository.objects_dir !== OBJECTS_DIRECTORY ||
    value.repository.quarantine_dir !== QUARANTINE_DIRECTORY ||
    typeof value.database.size_bytes !== "number" ||
    typeof value.database.sha256 !== "string"
  ) {
    throw new BackupIntegrityError(
      "Backup manifest contains unsafe paths or metadata",
    );
  }
  for (const entry of value.versions) {
    if (
      !isRecord(entry) ||
      typeof entry.storage_key !== "string" ||
      typeof entry.version_id !== "string"
    ) {
      throw new BackupIntegrityError(
        "Backup manifest contains an invalid version entry",
      );
    }
  }
  return value as unknown as BackupManifest;
}

async function prepareEmptyDirectory(directory: string): Promise<void> {
  try {
    const details = await fs.stat(directory);
    if (!details.isDirectory())
      throw new BackupCoordinatorError("Restore target is not a directory");
    const entries = await fs.readdir(directory);
    if (entries.length > 0)
      throw new BackupCoordinatorError(
        "Restore target must be an empty isolated directory",
      );
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(directory, { recursive: false, mode: 0o700 });
      return;
    }
    throw error;
  }
  await fs.chmod(directory, 0o700);
}

function safeManifestPath(root: string, relativePath: string): string {
  if (relativePath !== MANIFEST_FILE && relativePath !== DATABASE_FILE) {
    throw new BackupIntegrityError("Backup manifest path is invalid");
  }
  return path.join(root, relativePath);
}

function safeManifestObjectPath(
  root: string,
  directory: string,
  storageKey: string,
): string {
  if (
    directory !== OBJECTS_DIRECTORY ||
    !STORAGE_KEY_PATTERN.test(storageKey)
  ) {
    throw new BackupIntegrityError("Backup object path is invalid");
  }
  return path.join(root, directory, storageKey);
}

function restoreReason(error: unknown): string {
  if (error instanceof BackupIntegrityError) {
    if (error.message.includes("not found") || error.message.includes("ENOENT"))
      return "object_missing";
    if (error.message.includes("diverge")) return "metadata_divergence";
  }
  const code = (error as NodeJS.ErrnoException).code;
  return code === "ENOENT" ? "object_missing" : "object_integrity_failure";
}

function normalizeBackupError(error: unknown): Error {
  if (error instanceof BackupCoordinatorError) return error;
  return new BackupCoordinatorError(
    error instanceof Error ? error.message : "Backup operation failed",
  );
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultWriteWindow<T>(work: () => Promise<T>): Promise<T> {
  return work();
}

async function assertBackupComponents(
  root: string,
  manifest: BackupManifest,
): Promise<void> {
  const databasePath = safeManifestPath(root, manifest.database.file);
  const objectsPath = path.join(root, manifest.repository.objects_dir);
  try {
    const [databaseDetails, objectsDetails] = await Promise.all([
      fs.stat(databasePath),
      fs.stat(objectsPath),
    ]);
    if (!databaseDetails.isFile() || !objectsDetails.isDirectory()) {
      throw new BackupIntegrityError(
        "Backup must contain both SQLite and document repository components",
      );
    }
  } catch (error: unknown) {
    if (error instanceof BackupIntegrityError) throw error;
    throw new BackupIntegrityError(
      "Backup must contain both SQLite and document repository components",
    );
  }
}
