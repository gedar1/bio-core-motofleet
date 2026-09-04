import { promises as fs } from "node:fs";
import path from "node:path";
import { MAX_CONTRACT_DOCUMENT_BYTES } from "./DocumentStorage.js";

export const DEFAULT_CAPACITY_THRESHOLDS = [70, 85, 95] as const;
const MIB = 1024 * 1024;

export interface RepositoryCapacityStatus {
  readonly usedBytes: number;
  readonly quotaBytes: number | null;
  readonly availableBytes: number;
  readonly temporaryBytes: number;
  readonly orphanBytes: number;
  readonly writeErrors: number;
  readonly quotaPercent: number | null;
  readonly thresholdsReached: readonly number[];
}

export interface CapacityGuard {
  assertCanGuaranteeCapacity(requiredBytes: number): Promise<void>;
}

export class RepositoryConfigurationError extends Error {
  constructor() {
    super("Contract document repository configuration is invalid");
    this.name = "RepositoryConfigurationError";
  }
}

/** Safe upload error: its HTTP mapping never contains a filesystem path. */
export class RepositoryCapacityError extends Error {
  readonly statusCode: 503 | 507;

  constructor(statusCode: 503 | 507, message = "Contract document storage is unavailable") {
    super(message);
    this.name = "RepositoryCapacityError";
    this.statusCode = statusCode;
  }
}

export interface RepositoryCapacityMonitorOptions {
  readonly rootDir: string;
  readonly maxBytes?: number;
  readonly minimumAvailableBytes?: number;
  readonly temporaryMarginBytes?: number;
  readonly thresholds?: readonly number[];
  readonly referencedStorageKeys?: () => Promise<ReadonlySet<string>>;
  readonly statfs?: (directory: string) => Promise<{ bavail: number; bsize: number }>;
}

/**
 * Measures the private repository without returning physical paths. `maxBytes`
 * is optional; free-volume checks still protect uploads when it is omitted.
 */
export class RepositoryCapacityMonitor implements CapacityGuard {
  private readonly rootDir: string;
  private readonly maxBytes: number | undefined;
  private readonly minimumAvailableBytes: number;
  private readonly temporaryMarginBytes: number;
  private readonly thresholds: readonly number[];
  private writeErrors = 0;

  constructor(private readonly options: RepositoryCapacityMonitorOptions) {
    this.rootDir = path.resolve(options.rootDir);
    this.maxBytes = options.maxBytes;
    this.minimumAvailableBytes = options.minimumAvailableBytes ?? 50 * MIB;
    this.temporaryMarginBytes = options.temporaryMarginBytes ?? MAX_CONTRACT_DOCUMENT_BYTES;
    this.thresholds = options.thresholds ?? DEFAULT_CAPACITY_THRESHOLDS;
    if (
      (this.maxBytes !== undefined && (!Number.isSafeInteger(this.maxBytes) || this.maxBytes <= 0)) ||
      !Number.isSafeInteger(this.minimumAvailableBytes) || this.minimumAvailableBytes < 0 ||
      !Number.isSafeInteger(this.temporaryMarginBytes) || this.temporaryMarginBytes < 0 ||
      this.thresholds.some((threshold) => !Number.isFinite(threshold) || threshold <= 0 || threshold > 100) ||
      [...this.thresholds].some((threshold, index, values) => index > 0 && threshold <= values[index - 1])
    ) {
      throw new RepositoryConfigurationError();
    }
  }

  async initialize(): Promise<void> {
    const status = await this.status();
    if (status.availableBytes < this.minimumAvailableBytes + this.temporaryMarginBytes) {
      throw new RepositoryConfigurationError();
    }
    if (this.maxBytes !== undefined && this.maxBytes < this.temporaryMarginBytes) {
      throw new RepositoryConfigurationError();
    }
  }

  async status(): Promise<RepositoryCapacityStatus> {
    try {
      const [usage, filesystem] = await Promise.all([this.inspectUsage(), this.freeSpace()]);
      const quotaPercent = this.maxBytes === undefined ? null : (usage.usedBytes / this.maxBytes) * 100;
      return {
        ...usage,
        availableBytes: filesystem,
        quotaBytes: this.maxBytes ?? null,
        quotaPercent,
        thresholdsReached: quotaPercent === null ? [] : this.thresholds.filter((threshold) => quotaPercent >= threshold),
        writeErrors: this.writeErrors,
      };
    } catch (error) {
      if (error instanceof RepositoryConfigurationError) throw error;
      throw new RepositoryCapacityError(503);
    }
  }

  async assertCanGuaranteeCapacity(requiredBytes: number): Promise<void> {
    if (!Number.isSafeInteger(requiredBytes) || requiredBytes <= 0) {
      throw new RepositoryCapacityError(507);
    }
    let status: RepositoryCapacityStatus;
    try {
      status = await this.status();
    } catch (error) {
      if (error instanceof RepositoryCapacityError) throw error;
      throw new RepositoryCapacityError(503);
    }
    const reservation = requiredBytes + this.temporaryMarginBytes;
    if (
      status.availableBytes < this.minimumAvailableBytes + reservation ||
      (this.maxBytes !== undefined && status.usedBytes + reservation > this.maxBytes)
    ) {
      throw new RepositoryCapacityError(507);
    }
  }

  recordWriteError(): void {
    this.writeErrors += 1;
  }

  private async freeSpace(): Promise<number> {
    const statfs = this.options.statfs ?? (async (directory: string) => fs.statfs(directory));
    const stats = await statfs(this.rootDir);
    if (!Number.isFinite(stats.bavail) || !Number.isFinite(stats.bsize) || stats.bavail < 0 || stats.bsize <= 0) {
      throw new RepositoryConfigurationError();
    }
    return stats.bavail * stats.bsize;
  }

  private async inspectUsage(): Promise<{ usedBytes: number; temporaryBytes: number; orphanBytes: number }> {
    const temporaryDir = path.join(this.rootDir, "temporary");
    const objectsDir = path.join(this.rootDir, "objects");
    const [temporaryBytes, objectFiles] = await Promise.all([
      this.directoryBytes(temporaryDir),
      this.filesWithBytes(objectsDir),
    ]);
    const usedBytes = temporaryBytes + objectFiles.reduce((total, entry) => total + entry.bytes, 0);
    const references = this.options.referencedStorageKeys ? await this.options.referencedStorageKeys() : undefined;
    const orphanBytes = references
      ? objectFiles.filter((entry) => !references.has(entry.name)).reduce((total, entry) => total + entry.bytes, 0)
      : 0;
    return { usedBytes, temporaryBytes, orphanBytes };
  }

  private async directoryBytes(directory: string): Promise<number> {
    return (await this.filesWithBytes(directory)).reduce((total, entry) => total + entry.bytes, 0);
  }

  private async filesWithBytes(directory: string): Promise<Array<{ name: string; bytes: number }>> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => ({
      name: entry.name,
      bytes: (await fs.stat(path.join(directory, entry.name))).size,
    })));
  }
}

export interface ContractDocumentRepositoryConfiguration {
  readonly rootDir: string;
  readonly maxBytes?: number;
  readonly minimumAvailableBytes: number;
  readonly temporaryMarginBytes: number;
  readonly thresholds: readonly number[];
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new RepositoryConfigurationError();
  }
  return Number(value);
}

function parseThresholds(value: string | undefined): readonly number[] {
  if (!value?.trim()) return DEFAULT_CAPACITY_THRESHOLDS;
  const thresholds = value.split(",").map((part) => Number(part.trim()));
  if (thresholds.length !== 3 || thresholds.some((threshold) => !Number.isFinite(threshold))) {
    throw new RepositoryConfigurationError();
  }
  return thresholds;
}

export function readContractDocumentRepositoryConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ContractDocumentRepositoryConfiguration {
  const configuredRoot = env.CONTRACT_DOCUMENTS_DIR?.trim();
  if (!configuredRoot || !path.isAbsolute(configuredRoot)) throw new RepositoryConfigurationError();
  return {
    rootDir: path.resolve(configuredRoot),
    maxBytes: parsePositiveInteger(env.CONTRACT_DOCUMENTS_MAX_BYTES),
    minimumAvailableBytes: parsePositiveInteger(env.CONTRACT_DOCUMENTS_MIN_AVAILABLE_BYTES) ?? 50 * MIB,
    temporaryMarginBytes: parsePositiveInteger(env.CONTRACT_DOCUMENTS_TEMPORARY_MARGIN_BYTES) ?? MAX_CONTRACT_DOCUMENT_BYTES,
    thresholds: parseThresholds(env.CONTRACT_DOCUMENTS_CAPACITY_THRESHOLDS),
  };
}
