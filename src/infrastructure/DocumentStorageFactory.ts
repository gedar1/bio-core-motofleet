import type { DocumentStorage } from "./DocumentStorage.js";
import {
  readContractDocumentRepositoryConfiguration,
  RepositoryCapacityMonitor,
} from "./ContractDocumentRepository.js";
import { PrivateFilesystemDocumentStorage } from "./DocumentStorage.js";
import {
  S3CompatibleDocumentStorage,
  type S3ObjectClient,
} from "./S3CompatibleDocumentStorage.js";
import { createAwsS3CompatibleObjectClientFromEnvironment } from "./S3ObjectClient.js";

export type DocumentStorageProvider = "filesystem" | "s3";

export interface ConfiguredDocumentStorage {
  readonly provider: DocumentStorageProvider;
  readonly storage: DocumentStorage;
  readonly capacityMonitor?: RepositoryCapacityMonitor;
}

export interface DocumentStorageFactoryOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly publicRoot?: string;
  readonly servedRoot?: string;
  /** Optional database-backed inventory used by the capacity monitor. */
  readonly referencedStorageKeys?: () => Promise<ReadonlySet<string>>;
  readonly s3Client?: S3ObjectClient;
}

/**
 * Selects the active adapter only from configuration. This is called during
 * normal server initialization but never performs a filesystem-to-S3 copy.
 */
export async function createConfiguredDocumentStorage(
  options: DocumentStorageFactoryOptions = {},
): Promise<ConfiguredDocumentStorage> {
  const env = options.env ?? process.env;
  const provider = readProvider(env);
  if (provider === "s3") {
    const client =
      options.s3Client ?? createAwsS3CompatibleObjectClientFromEnvironment(env);
    const storage = new S3CompatibleDocumentStorage({
      client,
      prefix: env.CONTRACT_S3_PREFIX,
    });
    await storage.initialize();
    return { provider, storage };
  }

  const repository = readContractDocumentRepositoryConfiguration(env);
  const capacityMonitor = new RepositoryCapacityMonitor({
    rootDir: repository.rootDir,
    maxBytes: repository.maxBytes,
    minimumAvailableBytes: repository.minimumAvailableBytes,
    temporaryMarginBytes: repository.temporaryMarginBytes,
    thresholds: repository.thresholds,
    referencedStorageKeys: options.referencedStorageKeys,
  });
  const storage = new PrivateFilesystemDocumentStorage({
    rootDir: repository.rootDir,
    publicRoots: options.publicRoot ? [options.publicRoot] : [],
    servedRoots: options.servedRoot ? [options.servedRoot] : [],
    capacityGuard: capacityMonitor,
  });
  await storage.initialize();
  await capacityMonitor.initialize();
  return { provider, storage, capacityMonitor };
}

/** Used by the migration command, which always targets an explicitly S3 store. */
export async function createConfiguredS3DocumentStorage(
  options: DocumentStorageFactoryOptions = {},
): Promise<S3CompatibleDocumentStorage> {
  const env = options.env ?? process.env;
  const client =
    options.s3Client ?? createAwsS3CompatibleObjectClientFromEnvironment(env);
  const storage = new S3CompatibleDocumentStorage({
    client,
    prefix: env.CONTRACT_S3_PREFIX,
  });
  await storage.initialize();
  return storage;
}

export function readProvider(
  env: NodeJS.ProcessEnv = process.env,
): DocumentStorageProvider {
  const value =
    env.CONTRACT_STORAGE_PROVIDER?.trim().toLowerCase() || "filesystem";
  if (value !== "filesystem" && value !== "s3") {
    throw new Error("Contract document storage provider is invalid");
  }
  return value;
}
