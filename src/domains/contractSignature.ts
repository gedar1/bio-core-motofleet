import { ConflictError, ValidationError } from "./errors.js";

export const DOCUMENT_STATUSES = [
  "preparado",
  "enviado",
  "accedido",
  "cargado",
  "en_revision",
  "aprobado",
  "rechazado",
  "expirado",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const FORMALIZATION_STATUSES = [
  "pendiente_formalizacion",
  "activo",
  "vencido",
  "renovado",
  "cancelado",
] as const;
export type FormalizationStatus = (typeof FORMALIZATION_STATUSES)[number];

export const DELIVERY_ATTENTIONS = ["pending", "failed", "sent"] as const;
export type DeliveryAttention = (typeof DELIVERY_ATTENTIONS)[number];

export const DOCUMENT_VERSION_KINDS = ["original", "signed"] as const;
export type DocumentVersionKind = (typeof DOCUMENT_VERSION_KINDS)[number];

export const DOCUMENT_STORAGE_STATUSES = [
  "pending",
  "ready",
  "quarantined",
  "inconsistent",
  "retained",
  "deleted",
] as const;
export type DocumentStorageStatus = (typeof DOCUMENT_STORAGE_STATUSES)[number];

export const CONTRACT_SIGNATURE_ACTOR_TYPES = [
  "admin",
  "rider",
  "token",
  "system",
  "anonymous",
] as const;
export type ContractSignatureActorType =
  (typeof CONTRACT_SIGNATURE_ACTOR_TYPES)[number];

export const VERIFICATION_RESULTS = ["satisfactory", "unsatisfactory"] as const;
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];

export const DELIVERY_STATUSES = [
  "created",
  "queued",
  "sent",
  "failed",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const OUTBOX_STATUSES = [
  "pending",
  "processing",
  "sent",
  "failed",
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const CONTRACT_EMAIL_EVENT_TYPES = [
  "contract_sent",
  "contract_resent",
  "signed_document_available",
  "contract_approved",
  "contract_rejected",
  "link_expired",
] as const;
export type ContractEmailEventType =
  (typeof CONTRACT_EMAIL_EVENT_TYPES)[number];

export const CONTRACT_AUDIT_EVENT_TYPES = [
  "case_created",
  "original_upload_attempt",
  "original_uploaded",
  "signed_upload_attempt",
  "signed_uploaded",
  "storage_finalized",
  "storage_reconciled",
  "storage_quarantined",
  "retention_action",
  "backup_started",
  "backup_verified",
  "restore_started",
  "restore_verified",
  "restore_inconsistent",
  "migration_verified",
  "send_queued",
  "notification_attempt",
  "notification_sent",
  "notification_failed",
  "link_access",
  "document_download",
  "link_revoked",
  "link_expired",
  "review_started",
  "manual_verification",
  "approved",
  "rejected",
  "transition_failed",
] as const;
export type ContractAuditEventType =
  (typeof CONTRACT_AUDIT_EVENT_TYPES)[number];

export const AUDIT_RESULTS = ["success", "failure"] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export const PDF_VALIDATION_CODES = [
  "mime_invalid",
  "empty_file",
  "size_limit",
  "pdf_unreadable",
] as const;
export type PdfValidationCode = (typeof PDF_VALIDATION_CODES)[number];

const PDF_VALIDATION_MESSAGES: Readonly<Record<PdfValidationCode, string>> = {
  mime_invalid: "The uploaded file must be a PDF",
  empty_file: "The uploaded file must not be empty",
  size_limit: "The uploaded file exceeds the 25 MiB limit",
  pdf_unreadable: "The uploaded file is not a readable PDF",
};

/**
 * Safe client-facing validation error for document uploads. The cause is
 * deliberately restricted to the public codes defined above so parsers and
 * storage implementations cannot leak internal failure details.
 */
export class PdfValidationError extends ValidationError {
  readonly code: PdfValidationCode;

  constructor(code: PdfValidationCode) {
    super(PDF_VALIDATION_MESSAGES[code], { file: [code] });
    this.code = code;
  }
}

const documentTransitions: Readonly<
  Record<DocumentStatus, readonly DocumentStatus[]>
> = {
  preparado: ["enviado"],
  enviado: ["accedido", "cargado", "expirado", "enviado"],
  accedido: ["cargado", "expirado", "enviado"],
  cargado: ["en_revision", "enviado"],
  en_revision: ["aprobado", "rechazado", "enviado"],
  aprobado: [],
  rechazado: ["enviado"],
  expirado: ["enviado"],
};

const formalizationTransitions: Readonly<
  Record<FormalizationStatus, readonly FormalizationStatus[]>
> = {
  pendiente_formalizacion: ["activo"],
  activo: [],
  vencido: [],
  renovado: [],
  cancelado: [],
};

export function getValidDocumentTransitions(
  from: DocumentStatus,
): readonly DocumentStatus[] {
  return [...documentTransitions[from]];
}

export function isValidDocumentTransition(
  from: DocumentStatus,
  to: DocumentStatus,
): boolean {
  return documentTransitions[from].includes(to);
}

export function getValidFormalizationTransitions(
  from: FormalizationStatus,
): readonly FormalizationStatus[] {
  return [...formalizationTransitions[from]];
}

/** The signature flow can formalize only after the approval operation. */
export function isValidFormalizationTransition(
  from: FormalizationStatus,
  to: FormalizationStatus,
  context: { approved: boolean },
): boolean {
  return context.approved && formalizationTransitions[from].includes(to);
}

/** A machine-readable, HTTP-409-compatible conflict for a rejected transition. */
export class ContractSignatureStateConflictError extends ConflictError {
  readonly code = "CONTRACT_SIGNATURE_STATE_CONFLICT";

  constructor(
    readonly entity: "document" | "formalization",
    readonly currentState: string,
    readonly targetState: string,
  ) {
    super(
      `Cannot transition ${entity} from "${currentState}" to "${targetState}"`,
    );
  }
}

export function assertDocumentTransition(
  from: DocumentStatus,
  to: DocumentStatus,
): void {
  if (!isValidDocumentTransition(from, to)) {
    throw new ContractSignatureStateConflictError("document", from, to);
  }
}

export function assertFormalizationTransition(
  from: FormalizationStatus,
  to: FormalizationStatus,
  context: { approved: boolean },
): void {
  if (!isValidFormalizationTransition(from, to, context)) {
    throw new ContractSignatureStateConflictError("formalization", from, to);
  }
}
