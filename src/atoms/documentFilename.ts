/**
 * Normalizes a client-provided document name for metadata presentation.
 *
 * The returned value is never used as a storage key: it contains only the
 * final path component, has control characters replaced, and is bounded to a
 * safe display length. Physical storage uses an independently generated key.
 */
export function normalizeDocumentFilename(value: string): string {
  const basename = value.replace(/\\/g, "/").split("/").pop() ?? "";
  const safe = basename.replace(/[\u0000-\u001f\u007f]/g, "_").trim();
  return (safe || "signed-document.pdf").slice(0, 255);
}
