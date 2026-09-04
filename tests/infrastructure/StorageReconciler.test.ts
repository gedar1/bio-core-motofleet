import { Readable } from "node:stream";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { ContractAuditService } from "../../src/infrastructure/ContractAuditService.js";
import type {
  DocumentMetadata,
  DocumentStorage,
  DownloadableStorageStatus,
  RetentionDeletionRequest,
  StoredDocumentEntry,
  TemporaryDocument,
  TemporaryDocumentEntry,
} from "../../src/infrastructure/DocumentStorage.js";
import {
  StorageReconciler,
  type StorageRetentionPolicy,
} from "../../src/infrastructure/StorageReconciler.js";

const NOW = new Date("2025-03-01T12:00:00.000Z");
const DEFAULT_POLICY: StorageRetentionPolicy = {
  versionRetentionMs: 7 * 24 * 60 * 60 * 1000,
  temporaryRetentionMs: 60 * 60 * 1000,
  orphanGraceMs: 2 * 60 * 60 * 1000,
  quarantineRetentionMs: 24 * 60 * 60 * 1000,
  versionAction: "delete",
  quarantineAction: "delete",
};

class MemoryStorage implements DocumentStorage {
  readonly ready = new Map<string, StoredDocumentEntry>();
  readonly quarantined = new Map<string, StoredDocumentEntry>();
  readonly temporaries = new Map<string, TemporaryDocumentEntry>();

  async writeTemporary(): Promise<TemporaryDocument> { throw new Error("not used"); }
  async finalize(): Promise<never> { throw new Error("not used"); }
  async discardTemporary(temporary: TemporaryDocument): Promise<void> { this.temporaries.delete(temporary.temporaryKey); }
  async openRead(_key: string, status: DownloadableStorageStatus): Promise<Readable> {
    if (status !== "ready" && status !== "retained") throw new Error("Document is not available for download");
    return Readable.from([]);
  }
  async stat(storageKey: string): Promise<DocumentMetadata | null> {
    const object = this.ready.get(storageKey);
    return object ? { sizeBytes: object.sizeBytes, sha256: object.sha256 } : null;
  }
  async enumerate(state: "ready" | "quarantined" = "ready"): Promise<readonly StoredDocumentEntry[]> {
    return [...(state === "ready" ? this.ready : this.quarantined).values()];
  }
  async enumerateTemporary(): Promise<readonly TemporaryDocumentEntry[]> { return [...this.temporaries.values()]; }
  async quarantine(storageKey: string): Promise<void> {
    const object = this.ready.get(storageKey);
    if (!object) return;
    this.ready.delete(storageKey);
    this.quarantined.set(storageKey, { ...object, state: "quarantined" });
  }
  async deleteForRetention(storageKey: string, request: RetentionDeletionRequest): Promise<void> {
    if (!request.retentionExpired) throw new Error("Retention period has not expired");
    this.ready.delete(storageKey);
  }
  async deleteQuarantinedForRetention(storageKey: string, request: RetentionDeletionRequest): Promise<void> {
    if (!request.retentionExpired) throw new Error("Retention period has not expired");
    this.quarantined.delete(storageKey);
  }
}

function createDatabase(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE contract_document_versions (
      id TEXT PRIMARY KEY, case_id TEXT NOT NULL, storage_key TEXT NOT NULL,
      storage_status TEXT NOT NULL, size_bytes INTEGER NOT NULL, sha256 TEXT NOT NULL,
      uploaded_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE contract_audit_events (
      id TEXT PRIMARY KEY, case_id TEXT, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL,
      result TEXT NOT NULL, actor_type TEXT NOT NULL, actor_id TEXT,
      document_version_id TEXT, delivery_attempt_id TEXT, metadata_json TEXT NOT NULL,
      error_code TEXT, error_message TEXT
    );
  `);
  return db;
}

function insertVersion(
  db: Database.Database,
  overrides: Partial<{ id: string; key: string; status: string; size: number; sha: string; uploadedAt: string }> = {},
): { id: string; key: string } {
  const id = overrides.id ?? "version-1";
  const key = overrides.key ?? "doc_a";
  db.prepare(`INSERT INTO contract_document_versions
    (id, case_id, storage_key, storage_status, size_bytes, sha256, uploaded_at, updated_at)
    VALUES (?, 'case-1', ?, ?, ?, ?, ?, ?)`)
    .run(id, key, overrides.status ?? "ready", overrides.size ?? 10, overrides.sha ?? "a".repeat(64), overrides.uploadedAt ?? NOW.toISOString(), NOW.toISOString());
  return { id, key };
}

function readyObject(key: string, overrides: Partial<StoredDocumentEntry> = {}): StoredDocumentEntry {
  return {
    storageKey: key,
    state: "ready",
    sizeBytes: 10,
    sha256: "a".repeat(64),
    createdAt: NOW,
    ...overrides,
  };
}

function reconciler(db: Database.Database, storage: MemoryStorage, policy = DEFAULT_POLICY): StorageReconciler {
  return new StorageReconciler(db, storage, new ContractAuditService(db, { now: () => NOW }), policy, {
    now: () => NOW,
    processId: "test-reconciler",
  });
}

describe("StorageReconciler", () => {
  let db: Database.Database;
  let storage: MemoryStorage;

  beforeEach(() => {
    db = createDatabase();
    storage = new MemoryStorage();
  });

  it("marks only ready/retained references without exactly one matching object inconsistent and quarantines divergences", async () => {
    const missing = insertVersion(db, { id: "missing", key: "doc_missing" });
    const divergent = insertVersion(db, { id: "divergent", key: "doc_divergent" });
    insertVersion(db, { id: "deleted", key: "doc_deleted", status: "deleted" });
    storage.ready.set(divergent.key, readyObject(divergent.key, { sha256: "b".repeat(64) }));

    const first = await reconciler(db, storage).reconcile();
    expect(first).toMatchObject({ inconsistentVersions: 2, divergentObjectsQuarantined: 1 });
    expect(storage.quarantined.has(divergent.key)).toBe(true);
    expect(db.prepare("SELECT id, storage_status FROM contract_document_versions ORDER BY id").all()).toEqual([
      { id: "deleted", storage_status: "deleted" },
      { id: "divergent", storage_status: "inconsistent" },
      { id: "missing", storage_status: "inconsistent" },
    ]);
    await expect(storage.openRead(divergent.key, "inconsistent" as never)).rejects.toThrow("not available");

    const eventCount = (db.prepare("SELECT COUNT(*) AS count FROM contract_audit_events").get() as { count: number }).count;
    await expect(reconciler(db, storage).reconcile()).resolves.toEqual(expect.objectContaining({ inconsistentVersions: 0 }));
    expect((db.prepare("SELECT COUNT(*) AS count FROM contract_audit_events").get() as { count: number }).count).toBe(eventCount);
    expect(missing.id).toBe("missing");
  });

  it("cleans expired temporaries and quarantines only unreferenced objects past their grace period", async () => {
    storage.temporaries.set("tmp_a", {
      temporaryKey: "tmp_a", sizeBytes: 1, sha256: "c".repeat(64), createdAt: new Date(NOW.getTime() - DEFAULT_POLICY.temporaryRetentionMs),
    });
    storage.ready.set("doc_recent", readyObject("doc_recent", { createdAt: new Date(NOW.getTime() - DEFAULT_POLICY.orphanGraceMs + 1) }));
    storage.ready.set("doc_old", readyObject("doc_old", { createdAt: new Date(NOW.getTime() - DEFAULT_POLICY.orphanGraceMs) }));

    const report = await reconciler(db, storage).reconcile();
    expect(report).toMatchObject({ temporariesDeleted: 1, orphanedObjectsQuarantined: 1 });
    expect(storage.temporaries.size).toBe(0);
    expect(storage.ready.has("doc_recent")).toBe(true);
    expect(storage.quarantined.has("doc_old")).toBe(true);
  });

  it("preserves immutable content during retention and creates a deleted metadata tombstone only after authorized expiry", async () => {
    const valid = insertVersion(db, { uploadedAt: new Date(NOW.getTime() - DEFAULT_POLICY.versionRetentionMs + 1).toISOString() });
    storage.ready.set(valid.key, readyObject(valid.key));
    await expect(reconciler(db, storage).reconcile()).resolves.toMatchObject({ versionsDeleted: 0 });
    expect(db.prepare("SELECT storage_status FROM contract_document_versions WHERE id = ?").get(valid.id)).toEqual({ storage_status: "ready" });

    db.prepare("UPDATE contract_document_versions SET uploaded_at = ? WHERE id = ?")
      .run(new Date(NOW.getTime() - DEFAULT_POLICY.versionRetentionMs).toISOString(), valid.id);
    await expect(reconciler(db, storage).reconcile()).resolves.toMatchObject({ versionsDeleted: 1 });
    expect(storage.ready.has(valid.key)).toBe(false);
    expect(db.prepare("SELECT storage_status FROM contract_document_versions WHERE id = ?").get(valid.id)).toEqual({ storage_status: "deleted" });
    expect(db.prepare("SELECT event_type, actor_id FROM contract_audit_events WHERE event_type = 'retention_action'").get()).toEqual({ event_type: "retention_action", actor_id: "test-reconciler" });
  });

  it("can explicitly retain expired versions and delete aged quarantined objects under their separate policies", async () => {
    const version = insertVersion(db, { uploadedAt: new Date(NOW.getTime() - DEFAULT_POLICY.versionRetentionMs).toISOString() });
    storage.ready.set(version.key, readyObject(version.key));
    storage.quarantined.set("doc_quarantine", {
      ...readyObject("doc_quarantine", { createdAt: new Date(NOW.getTime() - DEFAULT_POLICY.quarantineRetentionMs) }),
      state: "quarantined",
    });
    const policy = { ...DEFAULT_POLICY, versionAction: "retain" as const };

    const report = await reconciler(db, storage, policy).reconcile();
    expect(report).toMatchObject({ versionsRetained: 1, quarantinedObjectsDeleted: 1 });
    expect(storage.ready.has(version.key)).toBe(true);
    expect(storage.quarantined.has("doc_quarantine")).toBe(false);
    expect(db.prepare("SELECT storage_status FROM contract_document_versions WHERE id = ?").get(version.id)).toEqual({ storage_status: "retained" });
  });
});
