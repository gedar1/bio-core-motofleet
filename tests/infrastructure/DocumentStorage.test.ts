import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  createStorageKey,
  DocumentStorageError,
  DocumentStorageLimitError,
  MAX_CONTRACT_DOCUMENT_BYTES,
  PrivateFilesystemDocumentStorage,
} from "../../src/infrastructure/DocumentStorage.js";

const roots: string[] = [];

async function createStorage(): Promise<PrivateFilesystemDocumentStorage> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "motofleet-contract-storage-"),
  );
  roots.push(root);
  return new PrivateFilesystemDocumentStorage({ rootDir: root });
}

function streamOf(bytes: Uint8Array): Readable {
  return Readable.from([bytes]);
}

async function readStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe("PrivateFilesystemDocumentStorage", () => {
  it("publishes a verified temporary object and reads it only through its opaque key", async () => {
    const storage = await createStorage();
    const bytes = Buffer.from("%PDF-1.7\ncontract body\n%%EOF");
    const temporary = await storage.writeTemporary(streamOf(bytes));
    const published = await storage.finalize(temporary, (metadata) => {
      expect(metadata.sizeBytes).toBe(bytes.length);
    });

    expect(published.storageKey).toMatch(/^doc_[a-f0-9]{64}$/);
    expect(published.sha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    await expect(storage.stat(published.storageKey)).resolves.toEqual({
      sizeBytes: bytes.length,
      sha256: published.sha256,
    });
    await expect(
      readStream(await storage.openRead(published.storageKey, "ready")),
    ).resolves.toEqual(bytes);
    await expect(storage.stat(temporary.temporaryKey)).rejects.toBeInstanceOf(
      DocumentStorageError,
    );
  });

  it("removes a temporary object when validation rejects publication", async () => {
    const storage = await createStorage();
    const temporary = await storage.writeTemporary(
      streamOf(Buffer.from("not a pdf")),
    );

    await expect(
      storage.finalize(temporary, () => {
        throw new Error("invalid PDF");
      }),
    ).rejects.toThrow("invalid PDF");

    await expect(storage.discardTemporary(temporary)).resolves.toBeUndefined();
  });

  it("rejects streams larger than 25 MiB and cleans the partial temporary", async () => {
    const storage = await createStorage();
    const oversize = Readable.from([
      Buffer.alloc(MAX_CONTRACT_DOCUMENT_BYTES),
      Buffer.from([1]),
    ]);

    await expect(storage.writeTemporary(oversize)).rejects.toBeInstanceOf(
      DocumentStorageLimitError,
    );
    await expect(storage.enumerate()).resolves.toEqual([]);
  });

  it("blocks inconsistent documents, traversal keys, and retention deletion before expiry", async () => {
    const storage = await createStorage();
    const published = await storage.finalize(
      await storage.writeTemporary(streamOf(Buffer.from("document"))),
    );

    await expect(
      storage.openRead(published.storageKey, "inconsistent" as never),
    ).rejects.toBeInstanceOf(DocumentStorageError);
    await expect(storage.openRead("../secret", "ready")).rejects.toBeInstanceOf(
      DocumentStorageError,
    );
    await expect(
      storage.deleteForRetention(published.storageKey, {
        retentionExpired: false,
      }),
    ).rejects.toBeInstanceOf(DocumentStorageError);
    await expect(
      storage.deleteForRetention(published.storageKey, {
        retentionExpired: true,
      }),
    ).resolves.toBeUndefined();
    await expect(storage.stat(published.storageKey)).resolves.toBeNull();
  });

  it("rejects public, served, shared-download, and Admin-local repository roots", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "motofleet-root-policy-"),
    );
    roots.push(root);
    const candidates = ["public", "served", "downloads", "admin"] as const;

    for (const name of candidates) {
      const unsafe = path.join(root, name, "documents");
      expect(
        () =>
          new PrivateFilesystemDocumentStorage({
            rootDir: unsafe,
            ...(name === "public"
              ? { publicRoots: [path.join(root, "public")] }
              : {}),
            ...(name === "served"
              ? { servedRoots: [path.join(root, "served")] }
              : {}),
            ...(name === "downloads"
              ? { sharedDownloadRoots: [path.join(root, "downloads")] }
              : {}),
            ...(name === "admin"
              ? { adminLocalRoots: [path.join(root, "admin")] }
              : {}),
          }),
      ).toThrow(DocumentStorageError);
    }
  });
});

/** Validates: Requirements 14.3, 15.1, 15.2, 15.8 */
describe("Property 15: Claves de almacenamiento opacas", () => {
  it("generates unique filesystem-safe keys unrelated to arbitrary rider, contract, or filename input", () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(..."GHIJKLMNOPQRSTUVWXYZ!@#$%"), {
          minLength: 1,
        }),
        fc.stringOf(fc.constantFrom(..."GHIJKLMNOPQRSTUVWXYZ!@#$%"), {
          minLength: 1,
        }),
        fc.stringOf(fc.constantFrom(..."GHIJKLMNOPQRSTUVWXYZ!@#$%"), {
          minLength: 1,
        }),
        (rider, contract, filename) => {
          const keys = Array.from({ length: 8 }, createStorageKey);
          expect(new Set(keys).size).toBe(keys.length);
          for (const key of keys) {
            expect(key).toMatch(/^doc_[a-f0-9]{64}$/);
            expect(key).not.toContain("..");
            expect(key).not.toContain("/");
            expect(key).not.toContain("\\");
            expect(key).not.toContain(rider);
            expect(key).not.toContain(contract);
            expect(key).not.toContain(filename);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
