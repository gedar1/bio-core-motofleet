import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PdfValidationError } from "../../src/domains/contractSignature.js";
import {
  MAX_PDF_BYTES,
  PDF_MIME_TYPE,
  PdfValidator,
} from "../../src/infrastructure/PdfValidator.js";

function validPdf(paddingBytes = 0): Buffer {
  const header = "%PDF-1.4\n";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n",
  ];
  const offsets: number[] = [];
  let body = header;
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  // Padding remains inside the document, before xref/EOF, so the fixture is
  // structurally valid even at the 25 MiB boundary.
  body += `%${" ".repeat(paddingBytes)}\n`;
  const xrefOffset = Buffer.byteLength(body);
  body += "xref\n0 4\n0000000000 65535 f \n";
  body += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}

function validPdfAtSize(sizeBytes: number): Buffer {
  let paddingBytes = sizeBytes - validPdf().length;
  let pdf = validPdf(paddingBytes);
  paddingBytes += sizeBytes - pdf.length;
  pdf = validPdf(paddingBytes);
  if (pdf.length !== sizeBytes)
    throw new Error("Unable to construct PDF fixture");
  return pdf;
}

async function expectCode(
  validation: Promise<unknown>,
  code: PdfValidationError["code"],
): Promise<void> {
  await expect(validation).rejects.toMatchObject({ code });
}

describe("PdfValidator", () => {
  const validator = new PdfValidator();

  it("accepts a structurally readable PDF and returns normalized metadata", async () => {
    const bytes = validPdf();

    await expect(
      validator.validate({
        bytes,
        declaredMimeType: " Application/PDF; charset=binary ",
      }),
    ).resolves.toEqual({
      mimeType: PDF_MIME_TYPE,
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  });

  it("rejects a non-PDF declared MIME before accepting PDF-like bytes", async () => {
    await expectCode(
      validator.validate({ bytes: validPdf(), declaredMimeType: "text/plain" }),
      "mime_invalid",
    );
  });

  it("rejects an empty upload", async () => {
    await expectCode(
      validator.validate({
        bytes: Buffer.alloc(0),
        declaredMimeType: PDF_MIME_TYPE,
      }),
      "empty_file",
    );
  });

  it("rejects truncated PDFs and arbitrary bytes despite a PDF MIME", async () => {
    await expectCode(
      validator.validate({
        bytes: validPdf().subarray(0, -6),
        declaredMimeType: PDF_MIME_TYPE,
      }),
      "pdf_unreadable",
    );
    await expectCode(
      validator.validate({
        bytes: Buffer.from("not a PDF"),
        declaredMimeType: PDF_MIME_TYPE,
      }),
      "pdf_unreadable",
    );
  });

  it("accepts exactly 25 MiB and rejects a file one byte larger", async () => {
    const atLimit = validPdfAtSize(MAX_PDF_BYTES);
    expect(atLimit).toHaveLength(MAX_PDF_BYTES);

    await expect(
      validator.validate({ bytes: atLimit, declaredMimeType: PDF_MIME_TYPE }),
    ).resolves.toMatchObject({
      sizeBytes: MAX_PDF_BYTES,
    });
    await expectCode(
      validator.validate({
        bytes: Buffer.concat([atLimit, Buffer.from("x")]),
        declaredMimeType: PDF_MIME_TYPE,
      }),
      "size_limit",
    );
  });
});
