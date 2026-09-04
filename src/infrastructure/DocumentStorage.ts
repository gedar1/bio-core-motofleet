import { createHash, randomBytes } from "node:crypto";
import {
  constants as fsConstants,
  createReadStream,
  promises as fs,
} from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import type { CapacityGuard } from "./ContractDocumentRepository.js";

/** Maximum size accepted for one contract document: 25 MiB. */
export const MAX_CONTRACT_DOCUMENT_BYTES = 25 * 1024 * 1024;
const STORAGE_KEY_PATTERN = /^doc_[a-f0-9]{64}$/;
const TEMPORARY_KEY_PATTERN = /^tmp_[a-f0-9]{64}$/;

export type DownloadableStorageStatus = "ready" | "retained";

export interface DocumentMetadata {
  readonly sizeBytes: number;
  readonly sha256: string;
}

/** Opaque handle returned while a document is still unpublished. */
export interface TemporaryDocument extends DocumentMetadata {
  readonly temporaryKey: string;
}

/** Logical object descriptor. It deliberately contains no physical path. */
export interface StoredDocument extends DocumentMetadata {
  readonly storageKey: string;
}

export interface StoredDocumentEntry extends StoredDocument {
  readonly state: "ready" | "quarantined";
  /** Filesystem/object-store timestamp used only for cleanup grace periods. */
  readonly createdAt: Date;
}

export interface TemporaryDocumentEntry extends TemporaryDocument {
  /** Timestamp used to decide whether a failed upload temporary has expired. */
  readonly createdAt: Date;
}

export interface RetentionDeletionRequest {
  /** A caller must explicitly establish that the retention deadline has passed. */
  readonly retentionExpired: boolean;
}

/**
 * Logical document repository contract. Domain and HTTP code only receive opaque
 * keys and streams, never a filesystem path or provider-specific URL.
 */
export interface DocumentStorage {
  writeTemporary(
    source: Readable | AsyncIterable<Uint8Array>,
  ): Promise<TemporaryDocument>;
  finalize(
    temporary: TemporaryDocument,
    validate?: (metadata: DocumentMetadata) => Promise<void> | void,
  ): Promise<StoredDocument>;
  discardTemporary(temporary: TemporaryDocument): Promise<void>;
  /**
   * Opens a temporary object for validation before final publication. This is
   * optional for legacy/fake adapters; production adapters expose it so the
   * upload pipeline validates the stored bytes rather than a client buffer.
   */
  openTemporary?(temporary: TemporaryDocument): Promise<Readable>;
  openRead(
    storageKey: string,
    status: DownloadableStorageStatus,
  ): Promise<Readable>;
  stat(storageKey: string): Promise<DocumentMetadata | null>;
  enumerate(
    state?: "ready" | "quarantined",
  ): Promise<readonly StoredDocumentEntry[]>;
  enumerateTemporary(): Promise<readonly TemporaryDocumentEntry[]>;
  quarantine(storageKey: string): Promise<void>;
  deleteForRetention(
    storageKey: string,
    request: RetentionDeletionRequest,
  ): Promise<void>;
  deleteQuarantinedForRetention(
    storageKey: string,
    request: RetentionDeletionRequest,
  ): Promise<void>;
}

export class DocumentStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentStorageError";
  }
}

export class DocumentStorageLimitError extends DocumentStorageError {
  constructor() {
    super("Document exceeds the maximum allowed size");
    this.name = "DocumentStorageLimitError";
  }
}

/** Generates an opaque, cryptographically random, filesystem-safe object key. */
export function createStorageKey(): string {
  return `doc_${randomBytes(32).toString("hex")}`;
}

function createTemporaryKey(): string {
  return `tmp_${randomBytes(32).toString("hex")}`;
}

function isSafeKey(key: string, pattern: RegExp): boolean {
  return pattern.test(key) && !key.includes("..") && !/[\\/]/.test(key);
}

function isWithin(candidate: string, parent: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export interface PrivateFilesystemStorageOptions {
  /** Mandatory absolute path supplied by CONTRACT_DOCUMENTS_DIR. */
  readonly rootDir: string;
  /** Directories which must never contain the private repository. */
  readonly publicRoots?: readonly string[];
  readonly servedRoots?: readonly string[];
  readonly sharedDownloadRoots?: readonly string[];
  /** Known Admin-local roots which must never be used as server storage. */
  readonly adminLocalRoots?: readonly string[];
  /** Optional capacity guard configured at process startup. */
  readonly capacityGuard?: CapacityGuard;
}

/**
 * MVP private filesystem storage. The object is not ready for download until
 * the caller has committed and marked its metadata ready in the database.
 */
export class PrivateFilesystemDocumentStorage implements DocumentStorage {
  private readonly rootDir: string;
  private readonly temporaryDir: string;
  private readonly objectsDir: string;
  private readonly quarantineDir: string;
  private initialized = false;
  private readOnly = false;

  constructor(private readonly options: PrivateFilesystemStorageOptions) {
    if (!path.isAbsolute(options.rootDir)) {
      throw new DocumentStorageError(
        "CONTRACT_DOCUMENTS_DIR must be an absolute private directory",
      );
    }

    this.rootDir = path.resolve(options.rootDir);
    this.assertPrivateRoot();
    this.temporaryDir = path.join(this.rootDir, "temporary");
    this.objectsDir = path.join(this.rootDir, "objects");
    this.quarantineDir = path.join(this.rootDir, "quarantine");
  }

  async initialize(): Promise<void> {
    await this.ensureInitialized();
  }

  /** Keeps the old filesystem available for rollback without allowing writes. */
  setReadOnly(): void {
    this.readOnly = true;
  }

  isReadOnly(): boolean {
    return this.readOnly;
  }

  async writeTemporary(
    source: Readable | AsyncIterable<Uint8Array>,
  ): Promise<TemporaryDocument> {
    this.assertWritable();
    await this.ensureInitialized();
    // Reserving a full maximum-size upload plus the monitor's temporary margin
    // prevents accepting an upload that cannot be completed atomically.
    await this.options.capacityGuard?.assertCanGuaranteeCapacity(
      MAX_CONTRACT_DOCUMENT_BYTES,
    );
    const temporaryKey = createTemporaryKey();
    const temporaryPath = this.pathForTemporary(temporaryKey);
    let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
    let sizeBytes = 0;
    const hash = createHash("sha256");

    try {
      handle = await fs.open(temporaryPath, "wx", 0o600);
      for await (const chunk of source) {
        const bytes = Buffer.from(chunk);
        sizeBytes += bytes.length;
        // Read one byte beyond the limit so an oversized stream is rejected
        // without accepting an unbounded upload.
        if (sizeBytes > MAX_CONTRACT_DOCUMENT_BYTES) {
          throw new DocumentStorageLimitError();
        }
        hash.update(bytes);
        await handle.write(bytes);
      }
      await handle.sync();
      return { temporaryKey, sizeBytes, sha256: hash.digest("hex") };
    } catch (error) {
      this.options.capacityGuard &&
        !(error instanceof DocumentStorageLimitError) &&
        "recordWriteError" in this.options.capacityGuard &&
        (
          this.options.capacityGuard as CapacityGuard & {
            recordWriteError(): void;
          }
        ).recordWriteError();
      await handle?.close().catch(() => undefined);
      await fs.unlink(temporaryPath).catch(() => undefined);
      throw error;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  async finalize(
    temporary: TemporaryDocument,
    validate: (metadata: DocumentMetadata) => Promise<void> | void = () =>
      undefined,
  ): Promise<StoredDocument> {
    this.assertWritable();
    await this.ensureInitialized();
    const temporaryPath = this.pathForTemporary(temporary.temporaryKey);
    let storageKey: string | undefined;

    try {
      const actual = await this.metadataForPath(temporaryPath);
      if (
        actual.sizeBytes !== temporary.sizeBytes ||
        actual.sha256 !== temporary.sha256
      ) {
        throw new DocumentStorageError(
          "Temporary document integrity check failed",
        );
      }
      await validate(actual);

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = createStorageKey();
        const finalPath = this.pathForObject(candidate, this.objectsDir);
        try {
          // link() creates the final name atomically without replacing an
          // existing immutable object. Removing the temporary name afterwards
          // is an atomic publication equivalent on this same filesystem.
          await fs.link(temporaryPath, finalPath);
          await fs.unlink(temporaryPath);
          storageKey = candidate;
          break;
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        }
      }
      if (!storageKey)
        throw new DocumentStorageError(
          "Unable to reserve a document storage key",
        );

      const published = await this.metadataForPath(
        this.pathForObject(storageKey, this.objectsDir),
      );
      if (
        published.sizeBytes !== temporary.sizeBytes ||
        published.sha256 !== temporary.sha256
      ) {
        await this.quarantine(storageKey);
        throw new DocumentStorageError("Final document integrity check failed");
      }
      return { storageKey, ...published };
    } catch (error) {
      // If publication did not happen, the temporary is safe to remove. A final
      // object that failed verification is quarantined above, never exposed.
      await fs.unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }

  async discardTemporary(temporary: TemporaryDocument): Promise<void> {
    await this.ensureInitialized();
    await fs
      .unlink(this.pathForTemporary(temporary.temporaryKey))
      .catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      });
  }

  async openTemporary(temporary: TemporaryDocument): Promise<Readable> {
    await this.ensureInitialized();
    try {
      return createReadStream(this.pathForTemporary(temporary.temporaryKey));
    } catch {
      throw new DocumentStorageError("Temporary document is unavailable");
    }
  }

  async openRead(
    storageKey: string,
    status: DownloadableStorageStatus,
  ): Promise<Readable> {
    if (status !== "ready" && status !== "retained") {
      throw new DocumentStorageError("Document is not available for download");
    }
    await this.ensureInitialized();
    const filePath = this.pathForObject(storageKey, this.objectsDir);
    try {
      await fs.access(filePath);
      return createReadStream(filePath);
    } catch {
      throw new DocumentStorageError("Document is not available for download");
    }
  }

  async stat(storageKey: string): Promise<DocumentMetadata | null> {
    await this.ensureInitialized();
    try {
      return await this.metadataForPath(
        this.pathForObject(storageKey, this.objectsDir),
      );
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new DocumentStorageError(
        "Unable to inspect document storage object",
      );
    }
  }

  async enumerate(
    state: "ready" | "quarantined" = "ready",
  ): Promise<readonly StoredDocumentEntry[]> {
    await this.ensureInitialized();
    const directory = state === "ready" ? this.objectsDir : this.quarantineDir;
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const objects: StoredDocumentEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !isSafeKey(entry.name, STORAGE_KEY_PATTERN))
        continue;
      const details = await fs.stat(path.join(directory, entry.name));
      const metadata = await this.metadataForPath(
        path.join(directory, entry.name),
      );
      objects.push({
        storageKey: entry.name,
        state,
        createdAt: details.birthtimeMs > 0 ? details.birthtime : details.mtime,
        ...metadata,
      });
    }
    return objects;
  }

  async enumerateTemporary(): Promise<readonly TemporaryDocumentEntry[]> {
    await this.ensureInitialized();
    const entries = await fs.readdir(this.temporaryDir, {
      withFileTypes: true,
    });
    const temporaries: TemporaryDocumentEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !isSafeKey(entry.name, TEMPORARY_KEY_PATTERN))
        continue;
      const filePath = path.join(this.temporaryDir, entry.name);
      const [details, metadata] = await Promise.all([
        fs.stat(filePath),
        this.metadataForPath(filePath),
      ]);
      temporaries.push({
        temporaryKey: entry.name,
        createdAt: details.birthtimeMs > 0 ? details.birthtime : details.mtime,
        ...metadata,
      });
    }
    return temporaries;
  }

  async quarantine(storageKey: string): Promise<void> {
    await this.ensureInitialized();
    const source = this.pathForObject(storageKey, this.objectsDir);
    const destination = this.pathForObject(storageKey, this.quarantineDir);
    try {
      await fs.rename(source, destination);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new DocumentStorageError(
          "Unable to quarantine document storage object",
        );
      }
    }
  }

  async deleteForRetention(
    storageKey: string,
    request: RetentionDeletionRequest,
  ): Promise<void> {
    if (!request.retentionExpired) {
      throw new DocumentStorageError("Retention period has not expired");
    }
    await this.ensureInitialized();
    const objectPath = this.pathForObject(storageKey, this.objectsDir);
    await fs.unlink(objectPath).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }

  async deleteQuarantinedForRetention(
    storageKey: string,
    request: RetentionDeletionRequest,
  ): Promise<void> {
    if (!request.retentionExpired) {
      throw new DocumentStorageError("Retention period has not expired");
    }
    await this.ensureInitialized();
    const objectPath = this.pathForObject(storageKey, this.quarantineDir);
    await fs.unlink(objectPath).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }

  private assertWritable(): void {
    if (this.readOnly) {
      throw new DocumentStorageError(
        "Private document repository is read-only",
      );
    }
  }

  private assertPrivateRoot(): void {
    const forbidden = [
      ...(this.options.publicRoots ?? []),
      ...(this.options.servedRoots ?? []),
      ...(this.options.sharedDownloadRoots ?? []),
      ...(this.options.adminLocalRoots ?? []),
    ].map((directory) => path.resolve(directory));

    if (forbidden.some((directory) => isWithin(this.rootDir, directory))) {
      throw new DocumentStorageError(
        "CONTRACT_DOCUMENTS_DIR must not be publicly served or Admin-local",
      );
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    for (const directory of [
      this.rootDir,
      this.temporaryDir,
      this.objectsDir,
      this.quarantineDir,
    ]) {
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      await fs.chmod(directory, 0o700);
      await fs.access(directory, fsConstants.R_OK | fsConstants.W_OK);
      const details = await fs.stat(directory);
      if (process.getuid && details.uid !== process.getuid()) {
        throw new DocumentStorageError(
          "Private document repository is unavailable",
        );
      }
      // Node exposes POSIX mode bits for directory stats on Unix. Windows
      // authorizes access through ACLs instead; its mode value is only a
      // compatibility projection and can report group/other bits even after
      // chmod(0o700). Keep fs.access above as the effective-process check and
      // enforce the stricter mode policy where these bits have real meaning.
      if (process.platform !== "win32" && (details.mode & 0o077) !== 0) {
        throw new DocumentStorageError(
          "Private document repository is unavailable",
        );
      }
    }
    this.initialized = true;
  }

  private pathForTemporary(temporaryKey: string): string {
    if (!isSafeKey(temporaryKey, TEMPORARY_KEY_PATTERN)) {
      throw new DocumentStorageError("Invalid temporary document handle");
    }
    return this.safePath(this.temporaryDir, temporaryKey);
  }

  private pathForObject(storageKey: string, directory: string): string {
    if (!isSafeKey(storageKey, STORAGE_KEY_PATTERN)) {
      throw new DocumentStorageError("Invalid document storage key");
    }
    return this.safePath(directory, storageKey);
  }

  private safePath(directory: string, key: string): string {
    const candidate = path.resolve(directory, key);
    if (!isWithin(candidate, directory))
      throw new DocumentStorageError("Invalid document storage key");
    return candidate;
  }

  private async metadataForPath(filePath: string): Promise<DocumentMetadata> {
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
}
