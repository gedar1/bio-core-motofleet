import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/infrastructure/database.js";
import { BackupCoordinator } from "../../src/infrastructure/BackupCoordinator.js";
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

const MIGRATIONS_DIR = path.resolve("src/migrations");
const roots: string[] = [];
const databases: Database.Database[] = [];

interface Fixture {
  readonly db: Database.Database;
  readonly dbPath: string;
  readonly storage: MemoryStorage;
  readonly storageRoot: string;
  readonly audit: ContractAuditService;
}

class MemoryStorage implements DocumentStorage {
  private nextTemporary = 0;
  readonly ready = new Map<
    string,
    { bytes: Buffer; entry: StoredDocumentEntry }
  >();
  readonly temporaries = new Map<
    string,
    { bytes: Buffer; temporary: TemporaryDocumentEntry }
  >();

  async writeTemporary(
    source: Readable | AsyncIterable<Uint8Array>,
  ): Promise<TemporaryDocument> {
    const chunks: Buffer[] = [];
    for await (const chunk of source) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    const temporaryKey = `tmp_${String(++this.nextTemporary).padStart(64, "0")}`;
    const metadata = this.metadata(bytes);
    const temporary = {
      temporaryKey,
      ...metadata,
      createdAt: new Date("2025-03-01T12:00:00.000Z"),
    };
    this.temporaries.set(temporaryKey, { bytes, temporary });
    return temporary;
  }

  async finalize(
    temporary: TemporaryDocument,
    validate?: (metadata: DocumentMetadata) => Promise<void> | void,
  ): Promise<{ storageKey: string } & DocumentMetadata> {
    const stored = this.temporaries.get(temporary.temporaryKey);
    if (!stored) throw new Error("temporary missing");
    const metadata = this.metadata(stored.bytes);
    await validate?.(metadata);
    const storageKey = `doc_${metadata.sha256}`;
    this.ready.set(storageKey, {
      bytes: Buffer.from(stored.bytes),
      entry: {
        storageKey,
        ...metadata,
        state: "ready",
        createdAt: new Date("2025-03-01T12:00:00.000Z"),
      },
    });
    this.temporaries.delete(temporary.temporaryKey);
    return { storageKey, ...metadata };
  }

  async discardTemporary(temporary: TemporaryDocument): Promise<void> {
    this.temporaries.delete(temporary.temporaryKey);
  }

  async openRead(
    storageKey: string,
    status: DownloadableStorageStatus,
  ): Promise<Readable> {
    if (status !== "ready" && status !== "retained")
      throw new Error("Document is not available for download");
    const object = this.ready.get(storageKey);
    if (!object) throw new Error("Document is not available for download");
    return Readable.from([Buffer.from(object.bytes)]);
  }

  async stat(storageKey: string): Promise<DocumentMetadata | null> {
    return this.ready.get(storageKey)?.entry ?? null;
  }

  async enumerate(
    state: "ready" | "quarantined" = "ready",
  ): Promise<readonly StoredDocumentEntry[]> {
    return state === "ready"
      ? [...this.ready.values()].map((object) => object.entry)
      : [];
  }

  async enumerateTemporary(): Promise<readonly TemporaryDocumentEntry[]> {
    return [...this.temporaries.values()].map((object) => object.temporary);
  }

  async quarantine(storageKey: string): Promise<void> {
    this.ready.delete(storageKey);
  }
  async deleteForRetention(
    _storageKey: string,
    _request: RetentionDeletionRequest,
  ): Promise<void> {
    this.ready.delete(_storageKey);
  }
  async deleteQuarantinedForRetention(
    _storageKey: string,
    _request: RetentionDeletionRequest,
  ): Promise<void> {}

  private metadata(bytes: Buffer): DocumentMetadata {
    return {
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }
}

async function createFixture(): Promise<Fixture> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "motofleet-backup-test-"),
  );
  roots.push(root);
  const dbPath = path.join(root, "source.sqlite");
  const storageRoot = path.join(root, "documents");
  const db = new Database(dbPath);
  databases.push(db);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  runMigrations(db, MIGRATIONS_DIR);
  const storage = new MemoryStorage();
  const audit = new ContractAuditService(db, {
    now: () => new Date("2025-03-01T12:00:00.000Z"),
  });

  db.prepare(
    "INSERT INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
  ).run("admin-1", "Backup Admin", "backup-admin@example.test", "hash");
  db.prepare(
    `INSERT INTO riders (
    id, name, phone, email, address, password_hash, license_number,
    license_expiry, insurance_number, insurance_expiry, bond_amount,
    emergency_contact_name, emergency_contact_phone
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "rider-1",
    "Backup Rider",
    "+570000000001",
    "backup-rider@example.test",
    "Test address",
    "hash",
    "LICENSE-1",
    "2030-01-01",
    "INSURANCE-1",
    "2030-01-01",
    100,
    "Emergency",
    "+570000000002",
  );
  db.prepare(
    `INSERT INTO motorcycles (
    id, plate, brand, model, year, color, engine_cc, soat_expiry, inspection_expiry
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "motorcycle-1",
    "BKP001",
    "Test",
    "Backup",
    2024,
    "Black",
    150,
    "2030-01-01",
    "2030-01-01",
  );
  db.prepare(
    `INSERT INTO rental_contracts (
    id, rider_id, motorcycle_id, start_date, end_date, monthly_amount, payment_day
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "contract-1",
    "rider-1",
    "motorcycle-1",
    "2025-01-01",
    "2025-12-31",
    100,
    1,
  );
  db.prepare(
    `INSERT INTO contract_signature_cases (
    id, contract_id, rider_id, motorcycle_id, created_by
  ) VALUES (?, ?, ?, ?, ?)`,
  ).run("case-1", "contract-1", "rider-1", "motorcycle-1", "admin-1");

  return { db, dbPath, storage, storageRoot, audit };
}

async function addVersion(
  fixture: Fixture,
  id: string,
  versionNumber: number,
  kind: "original" | "signed",
  bytes: Buffer,
): Promise<string> {
  const published = await fixture.storage.finalize(
    await fixture.storage.writeTemporary(Readable.from([bytes])),
  );
  const now = "2025-03-01T12:00:00.000Z";
  fixture.db
    .prepare(
      `INSERT INTO contract_document_versions (
    id, case_id, version_number, kind, storage_key, storage_status,
    original_filename, mime_type, size_bytes, sha256, uploaded_by_type,
    uploaded_by_id, created_at, uploaded_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, 'ready', ?, 'application/pdf', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      "case-1",
      versionNumber,
      kind,
      published.storageKey,
      `${kind}-${versionNumber}.pdf`,
      published.sizeBytes,
      published.sha256,
      kind === "original" ? "admin" : "rider",
      "admin-1",
      now,
      now,
      now,
    );
  if (kind === "original") {
    fixture.db
      .prepare(
        "UPDATE contract_signature_cases SET original_version_id = ? WHERE id = 'case-1'",
      )
      .run(id);
  } else {
    fixture.db
      .prepare(
        "UPDATE contract_signature_cases SET current_signed_version_id = ? WHERE id = 'case-1'",
      )
      .run(id);
  }
  return published.storageKey;
}

function coordinator(
  fixture: Fixture,
  options: ConstructorParameters<typeof BackupCoordinator>[3] = {},
): BackupCoordinator {
  return new BackupCoordinator(
    fixture.db,
    fixture.storage,
    fixture.audit,
    options,
  );
}

afterEach(async () => {
  for (const db of databases.splice(0)) {
    if (db.open) db.close();
  }
  await Promise.all(
    roots.splice(0).map((root) =>
      fs.rm(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 50,
      }),
    ),
  );
});

describe("BackupCoordinator", () => {
  it("creates a closed DB-plus-repository manifest and applies the capacity formula", async () => {
    const fixture = await createFixture();
    const bytes = Buffer.from("%PDF-1.7\noriginal\n%%EOF");
    const storageKey = await addVersion(
      fixture,
      "version-1",
      1,
      "original",
      bytes,
    );
    const destination = path.join(path.dirname(fixture.dbPath), "backup-1");
    const reservations: number[] = [];
    const backup = await coordinator(fixture, {
      capacityGuard: {
        assertCanGuaranteeCapacity: async (bytesRequired) =>
          reservations.push(bytesRequired),
      },
      snapshotTemporaryBytes: 100,
      growthMarginBytes: 10,
      now: () => new Date("2025-03-01T12:00:00.000Z"),
      createId: (() => {
        let count = 0;
        return () => `id-${++count}`;
      })(),
    }).createBackup(destination);

    expect(backup.manifest_version).toBe(1);
    expect(backup.closed_at).toBe("2025-03-01T12:00:00.000Z");
    expect(backup.versions).toHaveLength(1);
    expect(backup.versions[0]).toMatchObject({
      storage_key: storageKey,
      version_id: "version-1",
      version: 1,
      state: "ready",
      size_bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      relations: {
        contract_id: "contract-1",
        rider_id: "rider-1",
        motorcycle_id: "motorcycle-1",
      },
    });
    expect(backup.capacity).toEqual({
      objectBytes: bytes.length,
      snapshotTemporaryBytes: 100,
      growthMarginBytes: 10,
      requiredBytes: bytes.length + 110,
    });
    expect(reservations).toEqual([bytes.length + 110]);
    await expect(
      fs.stat(path.join(destination, "database.sqlite")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(destination, "objects", storageKey)),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(destination, "manifest.json")),
    ).resolves.toBeTruthy();
    expect(
      fixture.db
        .prepare(
          "SELECT COUNT(*) AS count FROM contract_audit_events WHERE event_type = 'backup_started'",
        )
        .get(),
    ).toEqual({ count: 1 });
  });

  it("restores into isolation and activates only after all versions verify", async () => {
    const fixture = await createFixture();
    await addVersion(
      fixture,
      "version-1",
      1,
      "original",
      Buffer.from("%PDF-1.7\noriginal\n%%EOF"),
    );
    const destination = path.join(path.dirname(fixture.dbPath), "backup-2");
    await coordinator(fixture, {
      createId: (() => {
        let count = 0;
        return () => `id-${++count}`;
      })(),
    }).createBackup(destination);
    const restoreRoot = path.join(path.dirname(fixture.dbPath), "restore-2");
    let activation: string | undefined;
    const report = await coordinator(fixture).restoreBackup(destination, {
      restoreRoot,
      activate: (context) => {
        activation = context.objectsPath;
      },
    });

    expect(report).toMatchObject({
      restoredVersions: 1,
      inconsistentVersions: 0,
      activated: true,
    });
    expect(activation).toBe(path.join(restoreRoot, "objects"));
    const restoredDb = new Database(report.databasePath, { readonly: true });
    expect(
      restoredDb
        .prepare(
          "SELECT storage_status FROM contract_document_versions WHERE id = 'version-1'",
        )
        .get(),
    ).toEqual({ storage_status: "ready" });
    restoredDb.close();
  });

  it("marks only a divergent version inconsistent, notifies the Admin, and keeps other versions restorable", async () => {
    const fixture = await createFixture();
    const firstKey = await addVersion(
      fixture,
      "version-1",
      1,
      "original",
      Buffer.from("%PDF-1.7\noriginal\n%%EOF"),
    );
    const secondKey = await addVersion(
      fixture,
      "version-2",
      2,
      "signed",
      Buffer.from("%PDF-1.7\nsigned\n%%EOF"),
    );
    const destination = path.join(path.dirname(fixture.dbPath), "backup-3");
    await coordinator(fixture).createBackup(destination);
    await fs.writeFile(
      path.join(destination, "objects", secondKey),
      Buffer.from("tampered"),
    );

    const incidents: string[] = [];
    const report = await coordinator(fixture).restoreBackup(destination, {
      restoreRoot: path.join(path.dirname(fixture.dbPath), "restore-3"),
      notifyAdmin: (incident) => {
        incidents.push(incident.versionId ?? "unknown");
      },
    });

    expect(report).toMatchObject({
      restoredVersions: 1,
      inconsistentVersions: 1,
      activated: false,
    });
    expect(incidents).toEqual(["version-2"]);
    const restoredDb = new Database(report.databasePath, { readonly: true });
    expect(
      restoredDb
        .prepare(
          "SELECT id, storage_status FROM contract_document_versions ORDER BY id",
        )
        .all(),
    ).toEqual([
      { id: "version-1", storage_status: "ready" },
      { id: "version-2", storage_status: "inconsistent" },
    ]);
    restoredDb.close();
    await expect(
      fs.stat(path.join(report.objectsPath, firstKey)),
    ).resolves.toBeTruthy();
  });

  it("does not accept a backup artifact that lost its repository component", async () => {
    const fixture = await createFixture();
    await addVersion(
      fixture,
      "version-1",
      1,
      "original",
      Buffer.from("%PDF-1.7\noriginal\n%%EOF"),
    );
    const destination = path.join(path.dirname(fixture.dbPath), "backup-4");
    await coordinator(fixture).createBackup(destination);
    await fs.rm(path.join(destination, "objects"), {
      recursive: true,
      force: true,
    });

    await expect(
      coordinator(fixture).restoreBackup(destination),
    ).rejects.toThrow(
      "Backup must contain both SQLite and document repository components",
    );
  });
});

it("does not close a backup when a snapshot reference has no repository object", async () => {
  const fixture = await createFixture();
  const missingKey = `doc_${"f".repeat(64)}`;
  fixture.db
    .prepare(
      `INSERT INTO contract_document_versions (
      id, case_id, version_number, kind, storage_key, storage_status,
      original_filename, mime_type, size_bytes, sha256, uploaded_by_type,
      uploaded_by_id, created_at, uploaded_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'ready', ?, 'application/pdf', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "version-missing",
      "case-1",
      1,
      "original",
      missingKey,
      "original.pdf",
      10,
      "a".repeat(64),
      "admin",
      "admin-1",
      "2025-03-01T12:00:00.000Z",
      "2025-03-01T12:00:00.000Z",
      "2025-03-01T12:00:00.000Z",
    );
  const destination = path.join(
    path.dirname(fixture.dbPath),
    "backup-missing-object",
  );

  await expect(coordinator(fixture).createBackup(destination)).rejects.toThrow(
    "Referenced document object is missing",
  );
  await expect(
    fs.stat(path.join(destination, "manifest.json")),
  ).rejects.toThrow();
});
