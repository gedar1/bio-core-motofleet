import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import {
  PdfValidationError,
  type PdfValidationCode,
} from "../domains/contractSignature.js";

/** Maximum accepted size for a contract PDF: 25 MiB. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const PDF_MIME_TYPE = "application/pdf";

export interface PdfValidationInput {
  /** Bytes written by the upload pipeline; filenames and extensions are ignored. */
  readonly bytes: Uint8Array;
  /** MIME value declared by the multipart client. It is normalized, not trusted alone. */
  readonly declaredMimeType?: string | null;
}

export interface ValidatedPdf {
  readonly mimeType: typeof PDF_MIME_TYPE;
  readonly sizeBytes: number;
  readonly sha256: string;
}

/**
 * Server-side PDF validation for both original and externally signed uploads.
 * It validates container readability only; it deliberately does not inspect or
 * cryptographically verify any external signature.
 */
export class PdfValidator {
  async validate(input: PdfValidationInput): Promise<ValidatedPdf> {
    const mimeType = normalizePdfMimeType(input.declaredMimeType);
    if (mimeType !== PDF_MIME_TYPE) this.reject("mime_invalid");

    const bytes = Buffer.from(input.bytes);
    if (bytes.length === 0) this.reject("empty_file");
    if (bytes.length > MAX_PDF_BYTES) this.reject("size_limit");

    // These inexpensive checks reject malformed data before invoking the parser
    // and ensure the document has a complete PDF framing, not merely a PDF MIME.
    if (
      !bytes.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
      !hasPdfTrailer(bytes)
    ) {
      this.reject("pdf_unreadable");
    }

    try {
      const document = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
      });
      if (document.getPageCount() < 1) this.reject("pdf_unreadable");
    } catch (error) {
      if (error instanceof PdfValidationError) throw error;
      this.reject("pdf_unreadable");
    }

    return {
      mimeType: PDF_MIME_TYPE,
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  private reject(code: PdfValidationCode): never {
    throw new PdfValidationError(code);
  }
}

/** Normalizes parameters/casing while rejecting absent or non-PDF MIME values. */
export function normalizePdfMimeType(
  declaredMimeType: string | null | undefined,
): string | null {
  if (!declaredMimeType) return null;
  const [type] = declaredMimeType.split(";", 1);
  const normalized = type.trim().toLowerCase();
  return normalized || null;
}

function hasPdfTrailer(bytes: Buffer): boolean {
  const tail = bytes
    .subarray(Math.max(0, bytes.length - 2048))
    .toString("latin1");
  // The parser validates the xref/trailer structure. This framing check ensures
  // the physical EOF marker closes the upload, allowing trailing PDF whitespace.
  return /%%EOF\s*$/.test(tail);
}
