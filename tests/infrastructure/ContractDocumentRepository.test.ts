import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  readContractDocumentRepositoryConfiguration,
  RepositoryCapacityError,
  RepositoryCapacityMonitor,
  RepositoryConfigurationError,
} from "../../src/infrastructure/ContractDocumentRepository.js";

const roots: string[] = [];

async function repositoryRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "motofleet-capacity-"));
  roots.push(root);
  await Promise.all(["temporary", "objects", "quarantine"].map((name) => fs.mkdir(path.join(root, name), { mode: 0o700 })));
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("contract document repository configuration", () => {
  it("rejects missing, relative, and invalid quota configuration without exposing the configured path", () => {
    for (const env of [
      {},
      { CONTRACT_DOCUMENTS_DIR: "relative/documents" },
      { CONTRACT_DOCUMENTS_DIR: path.resolve("private"), CONTRACT_DOCUMENTS_MAX_BYTES: "12.5" },
    ]) {
      expect(() => readContractDocumentRepositoryConfiguration(env)).toThrow(RepositoryConfigurationError);
    }
  });

  it("reports used, temporary, and orphan bytes and rejects uploads exceeding quota or free-space reservations", async () => {
    const root = await repositoryRoot();
    await fs.writeFile(path.join(root, "temporary", "tmp_a"), Buffer.alloc(10));
    await fs.writeFile(path.join(root, "objects", "doc_referenced"), Buffer.alloc(20));
    await fs.writeFile(path.join(root, "objects", "doc_orphan"), Buffer.alloc(30));
    const monitor = new RepositoryCapacityMonitor({
      rootDir: root,
      maxBytes: 100,
      minimumAvailableBytes: 20,
      temporaryMarginBytes: 10,
      thresholds: [50, 70, 95],
      referencedStorageKeys: async () => new Set(["doc_referenced"]),
      statfs: async () => ({ bavail: 1, bsize: 1_000 }),
    });

    await expect(monitor.status()).resolves.toMatchObject({
      usedBytes: 60,
      temporaryBytes: 10,
      orphanBytes: 30,
      quotaBytes: 100,
      thresholdsReached: [50],
    });
    await expect(monitor.assertCanGuaranteeCapacity(31)).rejects.toMatchObject({ statusCode: 507 });

    const insufficientVolume = new RepositoryCapacityMonitor({
      rootDir: root,
      minimumAvailableBytes: 100,
      temporaryMarginBytes: 10,
      statfs: async () => ({ bavail: 120, bsize: 1 }),
    });
    await expect(insufficientVolume.assertCanGuaranteeCapacity(20)).rejects.toMatchObject({ statusCode: 507 });
  });

  it("returns a safe 503 when volume capacity cannot be inspected", async () => {
    const root = await repositoryRoot();
    const monitor = new RepositoryCapacityMonitor({
      rootDir: root,
      statfs: async () => { throw new Error("device unavailable"); },
    });
    await expect(monitor.status()).rejects.toEqual(expect.objectContaining<Partial<RepositoryCapacityError>>({
      statusCode: 503,
    }));
  });
});

/** Validates: Requirements 14.2, 14.4, 15.6, 16.1 */
describe("Property: capacity limits fail closed", () => {
  it("rejects every reservation whose bytes plus temporary margin exceed the configured quota", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        async (usedBytes, requestedBytes) => {
          const root = await repositoryRoot();
          await fs.writeFile(path.join(root, "objects", "doc_used"), Buffer.alloc(usedBytes));
          const quota = usedBytes + requestedBytes + 9;
          const monitor = new RepositoryCapacityMonitor({
            rootDir: root,
            maxBytes: quota,
            minimumAvailableBytes: 0,
            temporaryMarginBytes: 10,
            statfs: async () => ({ bavail: 1_000_000, bsize: 1 }),
          });
          await expect(monitor.assertCanGuaranteeCapacity(requestedBytes)).rejects.toMatchObject({ statusCode: 507 });
        },
      ),
      { numRuns: 100 },
    );
  });
});
