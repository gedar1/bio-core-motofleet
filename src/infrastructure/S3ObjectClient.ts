import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { DocumentStorageError } from "./DocumentStorage.js";
import type {
  S3ListedObject,
  S3ObjectClient,
  S3ObjectInfo,
} from "./S3CompatibleDocumentStorage.js";

export interface AwsS3CompatibleClientOptions {
  readonly bucket: string;
  readonly region: string;
  readonly endpoint?: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken?: string;
  readonly forcePathStyle?: boolean;
}

/** Provider-specific S3 SDK boundary. The domain never receives this class. */
export class AwsS3CompatibleObjectClient implements S3ObjectClient {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: AwsS3CompatibleClientOptions) {
    if (!options.bucket.trim() || !options.region.trim() || !options.accessKeyId.trim() || !options.secretAccessKey.trim()) {
      throw new DocumentStorageError("S3 storage configuration is invalid");
    }
    this.bucket = options.bucket.trim();
    const config: S3ClientConfig = {
      region: options.region.trim(),
      ...(options.endpoint?.trim() ? { endpoint: options.endpoint.trim() } : {}),
      forcePathStyle: options.forcePathStyle ?? false,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        ...(options.sessionToken ? { sessionToken: options.sessionToken } : {}),
      },
    };
    this.client = new S3Client(config);
  }

  async putObject(input: Parameters<S3ObjectClient["putObject"]>[0]): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.body as Readable,
      ContentLength: input.contentLength,
      Metadata: { sha256: input.sha256, "created-at": input.createdAt.toISOString() },
      ...(input.ifNoneMatch ? { IfNoneMatch: "*" } : {}),
    }));
  }

  async getObject(key: string): Promise<Readable | AsyncIterable<Uint8Array> | Uint8Array> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!response.Body) throw new DocumentStorageError("S3 object body is unavailable");
    if (response.Body instanceof Readable) return response.Body;
    if (typeof response.Body === "object" && "transformToByteArray" in response.Body) {
      return response.Body.transformToByteArray();
    }
    return response.Body as AsyncIterable<Uint8Array>;
  }

  async headObject(key: string): Promise<S3ObjectInfo | null> {
    try {
      const response = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        sizeBytes: response.ContentLength ?? 0,
        sha256: response.Metadata?.sha256,
        createdAt: parseDate(response.Metadata?.["created-at"]) ?? response.LastModified,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async listObjects(prefix: string): Promise<readonly S3ListedObject[]> {
    const objects: S3ListedObject[] = [];
    let continuationToken: string | undefined;
    do {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      for (const object of response.Contents ?? []) {
        if (!object.Key) continue;
        objects.push({
          key: object.Key,
          sizeBytes: object.Size ?? 0,
          createdAt: object.LastModified ?? new Date(0),
        });
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
    return objects;
  }

  async copyObject(input: Parameters<S3ObjectClient["copyObject"]>[0]): Promise<void> {
    await this.client.send(new CopyObjectCommand({
      Bucket: this.bucket,
      Key: input.destinationKey,
      CopySource: encodeURIComponent(`${this.bucket}/${input.sourceKey}`),
      ...(input.ifNoneMatch ? { CopySourceIfNoneMatch: "*" } : {}),
    }));
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export function createAwsS3CompatibleObjectClientFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): AwsS3CompatibleObjectClient {
  const bucket = env.CONTRACT_S3_BUCKET?.trim();
  const region = env.CONTRACT_S3_REGION?.trim();
  const accessKeyId = env.CONTRACT_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CONTRACT_S3_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new DocumentStorageError("S3 storage configuration is invalid");
  }
  return new AwsS3CompatibleObjectClient({
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    ...(env.CONTRACT_S3_ENDPOINT?.trim() ? { endpoint: env.CONTRACT_S3_ENDPOINT.trim() } : {}),
    ...(env.CONTRACT_S3_SESSION_TOKEN?.trim() ? { sessionToken: env.CONTRACT_S3_SESSION_TOKEN.trim() } : {}),
    forcePathStyle: env.CONTRACT_S3_FORCE_PATH_STYLE === "true",
  });
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isNotFound(error: unknown): boolean {
  const value = error as { name?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  return value?.name === "NotFound" || value?.name === "NoSuchKey" || value?.code === "NotFound" || value?.code === "NoSuchKey" || value?.$metadata?.httpStatusCode === 404;
}
