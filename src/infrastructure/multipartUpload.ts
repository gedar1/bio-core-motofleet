import { Readable } from "node:stream";
import { normalizeDocumentFilename } from "../atoms/documentFilename.js";

/** Multipart overhead is bounded separately from the 25 MiB document limit. */
const MAX_MULTIPART_OVERHEAD_BYTES = 128 * 1024;

export type MultipartUploadErrorCode =
  | "MULTIPART_REQUIRED"
  | "MULTIPART_INVALID"
  | "FILE_TOO_LARGE";

/** Safe client-facing error raised before an upload reaches the molecule. */
export class MultipartUploadError extends Error {
  constructor(
    readonly code: MultipartUploadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MultipartUploadError";
  }
}

export interface MultipartFileUpload {
  readonly stream: Readable;
  readonly filename: string;
  readonly declaredMimeType: string | null;
}

/**
 * Parses one multipart file without a third-party dependency. The complete
 * request is bounded before a stream is handed to the domain, while the
 * molecule still owns temporary storage, PDF validation and the final DB
 * transaction. Non-file fields are ignored and multiple files are rejected.
 */
export async function parseSingleMultipartFile(
  request: Readable,
  contentType: string | undefined,
  maxFileBytes: number,
): Promise<MultipartFileUpload> {
  const boundary = extractBoundary(contentType);
  if (!boundary) {
    throw new MultipartUploadError(
      "MULTIPART_REQUIRED",
      "A multipart file upload is required",
    );
  }

  const maxRequestBytes = maxFileBytes + MAX_MULTIPART_OVERHEAD_BYTES;
  const chunks: Buffer[] = [];
  let requestBytes = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    requestBytes += bytes.length;
    if (requestBytes > maxRequestBytes) {
      throw new MultipartUploadError(
        "FILE_TOO_LARGE",
        "The uploaded file exceeds the 25 MiB limit",
      );
    }
    chunks.push(bytes);
  }

  const body = Buffer.concat(chunks, requestBytes);
  return parseMultipartBody(body, boundary, maxFileBytes);
}

function parseMultipartBody(
  body: Buffer,
  boundary: string,
  maxFileBytes: number,
): MultipartFileUpload {
  const delimiter = Buffer.from(`--${boundary}`, "latin1");
  const nextDelimiter = Buffer.from(`\r\n--${boundary}`, "latin1");
  let cursor = 0;

  if (!body.subarray(0, delimiter.length).equals(delimiter)) {
    throw invalidMultipart();
  }
  cursor = delimiter.length;

  let file: {
    bytes: Buffer;
    filename: string;
    mimeType: string | null;
  } | null = null;
  let finished = false;

  while (cursor < body.length) {
    if (body.subarray(cursor, cursor + 2).equals(Buffer.from("--"))) {
      cursor += 2;
      if (
        cursor < body.length &&
        !body.subarray(cursor).equals(Buffer.from("\r\n"))
      ) {
        throw invalidMultipart();
      }
      finished = true;
      break;
    }

    if (!body.subarray(cursor, cursor + 2).equals(Buffer.from("\r\n"))) {
      throw invalidMultipart();
    }
    cursor += 2;

    const headersEnd = body.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headersEnd < 0) throw invalidMultipart();
    const headers = parseHeaders(
      body.subarray(cursor, headersEnd).toString("latin1"),
    );
    cursor = headersEnd + 4;

    const partEnd = body.indexOf(nextDelimiter, cursor);
    if (partEnd < 0) throw invalidMultipart();
    const partBytes = body.subarray(cursor, partEnd);
    cursor = partEnd + 2;
    if (!body.subarray(cursor, cursor + delimiter.length).equals(delimiter)) {
      throw invalidMultipart();
    }
    cursor += delimiter.length;

    const disposition = headers.get("content-disposition");
    const filename = disposition && getParameter(disposition, "filename");
    if (filename !== undefined) {
      if (file) throw invalidMultipart();
      if (partBytes.length > maxFileBytes) {
        throw new MultipartUploadError(
          "FILE_TOO_LARGE",
          "The uploaded file exceeds the 25 MiB limit",
        );
      }
      file = {
        bytes: partBytes,
        filename: normalizeDocumentFilename(filename),
        mimeType: headers.get("content-type")?.split(";", 1)[0]?.trim() || null,
      };
    }
  }

  if (!finished || !file) throw invalidMultipart();
  return {
    stream: Readable.from([file.bytes]),
    filename: file.filename,
    declaredMimeType: file.mimeType,
  };
}

function extractBoundary(contentType: string | undefined): string | null {
  if (!contentType || !/^multipart\/form-data\s*;/i.test(contentType))
    return null;
  const match = /(?:^|;)\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const boundary = (match?.[1] ?? match?.[2])?.trim();
  if (!boundary || boundary.length > 200 || /[\r\n]/.test(boundary))
    return null;
  return boundary;
}

function parseHeaders(rawHeaders: string): Map<string, string> {
  const headers = new Map<string, string>();
  for (const line of rawHeaders.split("\r\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) throw invalidMultipart();
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (!name || !value || headers.has(name)) throw invalidMultipart();
    headers.set(name, value);
  }
  return headers;
}

function getParameter(header: string, parameter: string): string | undefined {
  const match = new RegExp(
    `(?:^|;)\\s*${parameter}=(?:"([^"]*)"|([^;\\s]*))`,
    "i",
  ).exec(header);
  return match?.[1] ?? match?.[2];
}

function invalidMultipart(): MultipartUploadError {
  return new MultipartUploadError(
    "MULTIPART_INVALID",
    "Invalid multipart upload",
  );
}
