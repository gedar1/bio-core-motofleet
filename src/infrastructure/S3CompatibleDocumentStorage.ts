import { createHash, randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import {
  createStorageKey,
  DocumentStorageError,
  DocumentStorageLimitError,
  MAX_CONTRACT_DOCUMENT_BYTES,
  type DocumentMetadata,
  type DocumentStorage,
  type DownloadableStorageStatus,
  type RetentionDeletionRequest,
  type StoredDocument,
  type StoredDocumentEntry,
  type TemporaryDocument,
  type TemporaryDocumentEntry,
} from "./DocumentStorage.js";

const STORAGE_KEY_PATTERN = /^doc_[a-f0-9]{64}$/;
const TEMPORARY_KEY_PATTERN = /^tmp_[a-f0-9]{64}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
type S3Directory = "temporary" | "objects" | "quarantine";

/**
 * Small provider-neutral contract used by the S3 adapter. Bucket names,
 * regions, credentials and provider URLs stay inside the infrastructure
 * implementation that creates this client; the document domain only sees
 * DocumentStorage.
 */
export interface S3ObjectClient {
  putObject(input: {
    readonly key: string;
    readonly body: Readable | AsyncIterable<Uint8Array>;
    readonly contentLength: number;
    readonly sha256: string;
    /** The provider must fail instead of replacing an existing object. */
    readonly ifNoneMatch: boolean;
    readonly createdAt: Date;
  }): Promise<void>;
  getObject(
    key: string,
  ): Promise<Readable | AsyncIterable<Uint8Array> | Uint8Array>;
  headObject(key: string): Promise<S3ObjectInfo | null>;
  listObjects(prefix: string): Promise<readonly S3ListedObject[]>;
  copyObject(input: {
    readonly sourceKey: string;
    readonly destinationKey: string;
    /** The provider must fail instead of replacing an existing object. */
    readonly ifNoneMatch: boolean;
  }): Promise<void>;
  deleteObject(key: string): Promise<void>;
}

export interface S3ObjectInfo {
  readonly sizeBytes: number;
  readonly sha256?: string;
  readonly createdAt?: Date;
}

export interface S3ListedObject {
  readonly key: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly sha256?: string;
}

export interface S3CompatibleDocumentStorageOptions {
  readonly client: S3ObjectClient;
  /** Logical prefix only; it is never returned to the domain or HTTP. */
  readonly prefix?: string;
  readonly now?: () => Date;
}

/**
 * S3-compatible implementation of DocumentStorage.
 *
 * S3 has no rename primitive, therefore finalization uses a conditional copy
 * (`If-None-Match: *`) and deletes the temporary only after the final object
 * has been re-read and its size/hash have been verified. A conflicting object
 * is never replaced.
 */
export class S3CompatibleDocumentStorage implements DocumentStorage {
  private readonly prefix: string;
  private readonly now: () => Date;

  constructor(private readonly options: S3CompatibleDocumentStorageOptions) {
    this.prefix = normalizePrefix(options.prefix);
    this.now = options.now ?? (() => new Date());
  }

  async initialize(): Promise<void> {
    // Kept as an explicit lifecycle hook so the active provider can be
    // initialized by startup without making it part of DocumentStorage.
  }

  async writeTemporary(
    source: Readable | AsyncIterable<Uint8Array>,
  ): Promise<TemporaryDocument> {
    const temporaryKey = createTemporaryKey();
    const providerKey = this.providerKey("temporary", temporaryKey);
    try {
      const document = await readBounded(source);
      await this.options.client.putObject({
        key: providerKey,
        body: Readable.from([document.bytes]),
        contentLength: document.sizeBytes,
        sha256: document.sha256,
        ifNoneMatch: true,
        createdAt: this.currentDate(),
      });
      return {
        temporaryKey,
        sizeBytes: document.sizeBytes,
        sha256: document.sha256,
      };
    } catch (error) {
      await this.options.client
        .deleteObject(providerKey)
        .catch(() => undefined);
      throw normalizeStorageError(error);
    }
  }

  async finalize(
    temporary: TemporaryDocument,
    validate: (metadata: DocumentMetadata) => Promise<void> | void = () =>
      undefined,
  ): Promise<StoredDocument> {
    assertTemporaryKey(temporary.temporaryKey);
    const sourceKey = this.providerKey("temporary", temporary.temporaryKey);
    let storageKey: string | undefined;
    try {
      const actualTemporary = await this.metadataForProviderKey(sourceKey);
      if (!actualTemporary || !sameMetadata(actualTemporary, temporary)) {
        throw new DocumentStorageError(
          "Temporary document integrity check failed",
        );
      }
      await validate(actualTemporary);

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = createStorageKey();
        try {
          await this.options.client.copyObject({
            sourceKey,
            destinationKey: this.providerKey("objects", candidate),
            ifNoneMatch: true,
          });
          storageKey = candidate;
          break;
        } catch (error) {
          if (!isConflict(error)) throw error;
        }
      }
      if (!storageKey) {
        throw new DocumentStorageError(
          "Unable to reserve a document storage key",
        );
      }

      const published = await this.stat(storageKey);
      if (!published || !sameMetadata(published, temporary)) {
        await this.quarantine(storageKey).catch(() => undefined);
        throw new DocumentStorageError("Final document integrity check failed");
      }
      await this.options.client.deleteObject(sourceKey);
      return { storageKey, ...published };
    } catch (error) {
      await this.options.client.deleteObject(sourceKey).catch(() => undefined);
      throw normalizeStorageError(error);
    }
  }

  async discardTemporary(temporary: TemporaryDocument): Promise<void> {
    assertTemporaryKey(temporary.temporaryKey);
    await this.options.client
      .deleteObject(this.providerKey("temporary", temporary.temporaryKey))
      .catch((error) => {
        if (!isNotFound(error)) throw normalizeStorageError(error);
      });
  }

  async openTemporary(temporary: TemporaryDocument): Promise<Readable> {
    assertTemporaryKey(temporary.temporaryKey);
    try {
      return toReadable(
        await this.options.client.getObject(
          this.providerKey("temporary", temporary.temporaryKey),
        ),
      );
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
    assertStorageKey(storageKey);
    try {
      return toReadable(
        await this.options.client.getObject(
          this.providerKey("objects", storageKey),
        ),
      );
    } catch {
      throw new DocumentStorageError("Document is not available for download");
    }
  }

  async stat(storageKey: string): Promise<DocumentMetadata | null> {
    assertStorageKey(storageKey);
    return this.metadataForProviderKey(this.providerKey("objects", storageKey));
  }

  async enumerate(
    state: "ready" | "quarantined" = "ready",
  ): Promise<readonly StoredDocumentEntry[]> {
    const directory = state === "ready" ? "objects" : "quarantine";
    const listed = await this.options.client.listObjects(
      this.providerKey(directory),
    );
    const result: StoredDocumentEntry[] = [];
    for (const object of listed) {
      const storageKey = this.logicalKey(directory, object.key);
      if (!storageKey) continue;
      const metadata = await this.metadataForListedObject(object);
      result.push({
        storageKey,
        state,
        createdAt: metadata.createdAt,
        sizeBytes: metadata.sizeBytes,
        sha256: metadata.sha256,
      });
    }
    return result;
  }

  async enumerateTemporary(): Promise<readonly TemporaryDocumentEntry[]> {
    const listed = await this.options.client.listObjects(
      this.providerKey("temporary"),
    );
    const result: TemporaryDocumentEntry[] = [];
    for (const object of listed) {
      const temporaryKey = this.logicalKey("temporary", object.key);
      if (!temporaryKey || !TEMPORARY_KEY_PATTERN.test(temporaryKey)) continue;
      const metadata = await this.metadataForListedObject(object);
      result.push({
        temporaryKey,
        createdAt: metadata.createdAt,
        sizeBytes: metadata.sizeBytes,
        sha256: metadata.sha256,
      });
    }
    return result;
  }

  async quarantine(storageKey: string): Promise<void> {
    assertStorageKey(storageKey);
    const sourceKey = this.providerKey("objects", storageKey);
    const destinationKey = this.providerKey("quarantine", storageKey);
    const source = await this.options.client.headObject(sourceKey);
    if (!source) return;

    const existing = await this.options.client.headObject(destinationKey);
    if (existing) {
      const sourceMetadata = await this.metadataForProviderKey(sourceKey);
      const quarantineMetadata =
        await this.metadataForProviderKey(destinationKey);
      if (
        !sourceMetadata ||
        !quarantineMetadata ||
        !sameMetadata(sourceMetadata, quarantineMetadata)
      ) {
        throw new DocumentStorageError(
          "Unable to quarantine conflicting document object",
        );
      }
      await this.options.client.deleteObject(sourceKey);
      return;
    }

    try {
      await this.options.client.copyObject({
        sourceKey,
        destinationKey,
        ifNoneMatch: true,
      });
      await this.options.client.deleteObject(sourceKey);
    } catch (error) {
      throw normalizeStorageError(
        error,
        "Unable to quarantine document storage object",
      );
    }
  }

  async deleteForRetention(
    storageKey: string,
    request: RetentionDeletionRequest,
  ): Promise<void> {
    assertRetentionExpired(request);
    assertStorageKey(storageKey);
    await this.deleteIfPresent(this.providerKey("objects", storageKey));
  }

  async deleteQuarantinedForRetention(
    storageKey: string,
    request: RetentionDeletionRequest,
  ): Promise<void> {
    assertRetentionExpired(request);
    assertStorageKey(storageKey);
    await this.deleteIfPresent(this.providerKey("quarantine", storageKey));
  }

  /**
   * Operational-only import used by the migration. It preserves the logical
   * storage_key and is intentionally not part of the domain-facing contract.
   */
  async putAtKey(
    storageKey: string,
    source: Readable | AsyncIterable<Uint8Array>,
    expected: DocumentMetadata,
  ): Promise<StoredDocument> {
    assertStorageKey(storageKey);
    assertMetadata(expected);
    const destinationKey = this.providerKey("objects", storageKey);
    const existing = await this.stat(storageKey);
    if (existing) {
      if (sameMetadata(existing, expected)) return { storageKey, ...existing };
      throw new DocumentStorageError(
        "Document storage key already contains different content",
      );
    }

    const document = await readBounded(source);
    if (!sameMetadata(document, expected)) {
      throw new DocumentStorageError(
        "Migrated document integrity check failed",
      );
    }
    try {
      await this.options.client.putObject({
        key: destinationKey,
        body: Readable.from([document.bytes]),
        contentLength: document.sizeBytes,
        sha256: document.sha256,
        ifNoneMatch: true,
        createdAt: this.currentDate(),
      });
    } catch (error) {
      if (isConflict(error)) {
        const raced = await this.stat(storageKey);
        if (raced && sameMetadata(raced, expected))
          return { storageKey, ...raced };
      }
      throw normalizeStorageError(error);
    }

    const published = await this.stat(storageKey);
    if (!published || !sameMetadata(published, expected)) {
      await this.quarantine(storageKey).catch(() => undefined);
      throw new DocumentStorageError(
        "Migrated document integrity check failed",
      );
    }
    return { storageKey, ...published };
  }

  private async metadataForProviderKey(
    providerKey: string,
  ): Promise<DocumentMetadata | null> {
    const head = await this.options.client.headObject(providerKey);
    if (!head) return null;
    const metadata = await this.metadataFromHead(providerKey, head);
    return { sizeBytes: metadata.sizeBytes, sha256: metadata.sha256 };
  }

  private async metadataForListedObject(
    object: S3ListedObject,
  ): Promise<{ sizeBytes: number; sha256: string; createdAt: Date }> {
    const head = await this.options.client.headObject(object.key);
    if (!head)
      throw new DocumentStorageError("Listed document object disappeared");
    return this.metadataFromHead(object.key, {
      ...head,
      sizeBytes: head.sizeBytes || object.sizeBytes,
      createdAt: head.createdAt ?? object.createdAt,
      sha256: head.sha256 ?? object.sha256,
    });
  }

  private async metadataFromHead(
    providerKey: string,
    head: S3ObjectInfo,
  ): Promise<{ sizeBytes: number; sha256: string; createdAt: Date }> {
    if (!Number.isSafeInteger(head.sizeBytes) || head.sizeBytes < 0) {
      throw new DocumentStorageError("S3 object metadata is invalid");
    }
    const createdAt = head.createdAt ?? this.currentDate();
    if (Number.isNaN(createdAt.getTime())) {
      throw new DocumentStorageError("S3 object timestamp is invalid");
    }
    if (head.sha256 && SHA256_PATTERN.test(head.sha256)) {
      return { sizeBytes: head.sizeBytes, sha256: head.sha256, createdAt };
    }
    const actual = await readBounded(
      await this.options.client.getObject(providerKey),
    );
    if (actual.sizeBytes !== head.sizeBytes) {
      throw new DocumentStorageError("S3 object size metadata is inconsistent");
    }
    return { ...actual, createdAt };
  }

  private async deleteIfPresent(providerKey: string): Promise<void> {
    await this.options.client.deleteObject(providerKey).catch((error) => {
      if (!isNotFound(error)) throw normalizeStorageError(error);
    });
  }

  private providerKey(directory: S3Directory, key = ""): string {
    return `${this.prefix}${directory}/${key}`;
  }

  private logicalKey(
    directory: S3Directory,
    providerKey: string,
  ): string | null {
    const prefix = this.providerKey(directory);
    if (!providerKey.startsWith(prefix)) return null;
    const key = providerKey.slice(prefix.length);
    return key && !key.includes("/") ? key : null;
  }

  private currentDate(): Date {
    const value = this.now();
    if (Number.isNaN(value.getTime()))
      throw new DocumentStorageError("Storage clock returned an invalid date");
    return value;
  }
}

function normalizePrefix(prefix = ""): string {
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  if (trimmed.includes("..") || /[\\]/.test(trimmed)) {
    throw new DocumentStorageError("S3 storage prefix is invalid");
  }
  return `${trimmed}/`;
}

function createTemporaryKey(): string {
  return `tmp_${randomBytes(32).toString("hex")}`;
}

function assertStorageKey(storageKey: string): void {
  if (!STORAGE_KEY_PATTERN.test(storageKey) || storageKey.includes("..")) {
    throw new DocumentStorageError("Invalid document storage key");
  }
}

function assertTemporaryKey(temporaryKey: string): void {
  if (
    !TEMPORARY_KEY_PATTERN.test(temporaryKey) ||
    temporaryKey.includes("..")
  ) {
    throw new DocumentStorageError("Invalid temporary document handle");
  }
}

function assertRetentionExpired(request: RetentionDeletionRequest): void {
  if (!request.retentionExpired)
    throw new DocumentStorageError("Retention period has not expired");
}

function assertMetadata(metadata: DocumentMetadata): void {
  if (
    !Number.isSafeInteger(metadata.sizeBytes) ||
    metadata.sizeBytes < 0 ||
    !SHA256_PATTERN.test(metadata.sha256)
  ) {
    throw new DocumentStorageError("Document metadata is invalid");
  }
}

function sameMetadata(
  left: DocumentMetadata,
  right: DocumentMetadata,
): boolean {
  return left.sizeBytes === right.sizeBytes && left.sha256 === right.sha256;
}

async function readBounded(
  source: Readable | AsyncIterable<Uint8Array> | Uint8Array,
): Promise<{ bytes: Buffer; sizeBytes: number; sha256: string }> {
  const hash = createHash("sha256");
  const chunks: Buffer[] = [];
  let sizeBytes = 0;
  const iterable: AsyncIterable<Uint8Array> =
    source instanceof Uint8Array
      ? (async function* () {
          yield source;
        })()
      : source;
  for await (const chunk of iterable) {
    const bytes = Buffer.from(chunk);
    sizeBytes += bytes.length;
    if (sizeBytes > MAX_CONTRACT_DOCUMENT_BYTES)
      throw new DocumentStorageLimitError();
    hash.update(bytes);
    chunks.push(bytes);
  }
  return {
    bytes: Buffer.concat(chunks),
    sizeBytes,
    sha256: hash.digest("hex"),
  };
}

function toReadable(
  value: Readable | AsyncIterable<Uint8Array> | Uint8Array,
): Readable {
  if (value instanceof Readable) return value;
  if (value instanceof Uint8Array) return Readable.from([value]);
  return Readable.from(value);
}

function isConflict(error: unknown): boolean {
  const value = error as {
    code?: string;
    name?: string;
    statusCode?: number;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    value?.code === "ConditionalRequestConflict" ||
    value?.code === "PreconditionFailed" ||
    value?.name === "ConditionalRequestConflict" ||
    value?.name === "PreconditionFailed" ||
    value?.statusCode === 409 ||
    value?.$metadata?.httpStatusCode === 412
  );
}

function isNotFound(error: unknown): boolean {
  const value = error as {
    code?: string;
    name?: string;
    statusCode?: number;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    value?.code === "NoSuchKey" ||
    value?.code === "NotFound" ||
    value?.name === "NoSuchKey" ||
    value?.name === "NotFound" ||
    value?.statusCode === 404 ||
    value?.$metadata?.httpStatusCode === 404
  );
}

function normalizeStorageError(
  error: unknown,
  fallback = "Document storage operation failed",
): Error {
  if (
    error instanceof DocumentStorageError ||
    error instanceof DocumentStorageLimitError
  )
    return error;
  if (isNotFound(error))
    return new DocumentStorageError("Document storage object is unavailable");
  if (isConflict(error))
    return new DocumentStorageError("Document storage object already exists");
  return new DocumentStorageError(fallback);
}
