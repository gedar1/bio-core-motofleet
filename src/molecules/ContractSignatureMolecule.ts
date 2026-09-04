import { Readable } from "node:stream";
import { v4 as uuidv4 } from "uuid";
import type Database from "better-sqlite3";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import type {
  DocumentStorage,
  DownloadableStorageStatus,
  StoredDocument,
  TemporaryDocument,
} from "../infrastructure/DocumentStorage.js";
import { MAX_CONTRACT_DOCUMENT_BYTES } from "../infrastructure/DocumentStorage.js";
import type { PdfValidator } from "../infrastructure/PdfValidator.js";
import type {
  ContractLinkResolution,
  TokenService,
} from "../infrastructure/TokenService.js";
import type {
  ContractAuditPage,
  ContractAuditService,
  RecordContractAuditEventInput,
} from "../infrastructure/ContractAuditService.js";
import {
  PdfValidationError,
  assertDocumentTransition,
  assertFormalizationTransition,
  type ContractEmailEventType,
  type DeliveryStatus,
  type DocumentStatus,
  type FormalizationStatus,
  type DocumentVersionKind,
  type DocumentStorageStatus,
  type VerificationResult,
} from "../domains/contractSignature.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../domains/errors.js";
import { getCurrentUtcTimestamp } from "../atoms/dateUtils.js";
import { normalizeDocumentFilename } from "../atoms/documentFilename.js";
import { RepositoryCapacityError } from "../infrastructure/ContractDocumentRepository.js";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface CreateCaseInput {
  contractId: string;
  adminId: string;
}

export interface UploadOriginalDocumentInput {
  caseId: string;
  adminId: string;
  fileStream: Readable | AsyncIterable<Uint8Array>;
  originalFilename: string;
  declaredMimeType: string | null;
}

export interface UploadSignedDocumentInput {
  token: string;
  authenticatedRiderId?: string;
  fileStream: Readable | AsyncIterable<Uint8Array>;
  originalFilename: string;
  declaredMimeType: string | null;
}

export interface ContractSignatureCase {
  id: string;
  contract_id: string;
  rider_id: string;
  motorcycle_id: string;
  document_status: DocumentStatus;
  formalization_status: FormalizationStatus;
  delivery_attention: string | null;
  original_version_id: string | null;
  current_signed_version_id: string | null;
  reviewed_version_id: string | null;
  formalized_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContractDocumentVersion {
  id: string;
  case_id: string;
  version_number: number;
  kind: DocumentVersionKind;
  storage_key: string;
  storage_status: DocumentStorageStatus;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  uploaded_by_type: string;
  uploaded_by_id: string | null;
  created_at: string;
  uploaded_at: string;
  updated_at: string;
}

export interface UploadOriginalDocumentResult {
  signatureCase: ContractSignatureCase;
  documentVersion: ContractDocumentVersion;
}

// ---------------------------------------------------------------------------
// Internal DB row types
// ---------------------------------------------------------------------------

interface ContractRow {
  id: string;
  rider_id: string;
  motorcycle_id: string;
  status: string;
}

interface RiderRow {
  id: string;
}

interface MotorcycleRow {
  id: string;
}

interface AdminRow {
  id: string;
}

interface DeliveryContextRow {
  case_id: string;
  contract_id: string;
  rider_id: string;
  document_status: DocumentStatus;
  formalization_status: FormalizationStatus;
  original_version_id: string | null;
  rider_email: string;
  legacy_contract_status: string;
  original_kind: DocumentVersionKind | null;
  original_storage_status: DocumentStorageStatus | null;
}

interface DeliveryAttemptRow extends ContractDeliveryAttempt {}

export interface ContractDeliveryAttempt {
  id: string;
  case_id: string;
  document_version_id: string;
  attempt_number: number;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  delivery_status: DeliveryStatus;
  last_error: string | null;
  created_by: string;
}

export interface SendContractInput {
  caseId: string;
  adminId: string;
}

export interface SendContractResult {
  signatureCase: ContractSignatureCase;
  deliveryAttempt: ContractDeliveryAttempt;
}

export interface StartReviewInput {
  caseId: string;
  adminId: string;
}

export interface ManualVerificationInput {
  caseId: string;
  adminId: string;
  /** Camel-case is used by the molecule; version_id is accepted for route adapters. */
  versionId?: string;
  version_id?: string;
  result: VerificationResult | string;
  comments?: string | null;
}

export interface ContractVerification {
  id: string;
  case_id: string;
  document_version_id: string;
  admin_id: string;
  result: VerificationResult;
  comments: string | null;
  created_at: string;
}

export interface ManualVerificationResult {
  signatureCase: ContractSignatureCase;
  documentVersion: ContractDocumentVersion;
  verification: ContractVerification;
}

export interface ApprovalInput {
  caseId: string;
  adminId: string;
  versionId?: string;
  version_id?: string;
}

export interface ApprovalResult {
  signatureCase: ContractSignatureCase;
  documentVersion: ContractDocumentVersion;
  formalizedAt: string;
}

export interface RejectionInput {
  caseId: string;
  adminId: string;
  reason: string;
}

export interface RejectionResult {
  signatureCase: ContractSignatureCase;
  documentVersion: ContractDocumentVersion;
  reason: string;
}

export interface ReviewStartResult {
  signatureCase: ContractSignatureCase;
  documentVersion: ContractDocumentVersion;
}

/** Administrative read model. It contains no plaintext link token. */
export interface AdministrativeSignatureCase extends ContractSignatureCase {
  legacy_contract_status: string;
  original_version: ContractDocumentVersion | null;
  current_signed_version: ContractDocumentVersion | null;
  current_delivery_attempt: ContractDeliveryAttempt | null;
}

export interface ContractDeliveryAttemptPage {
  readonly data: readonly ContractDeliveryAttempt[];
  readonly nextCursor: string | null;
}

export interface ReviewQueueItem {
  readonly signatureCase: ContractSignatureCase;
  readonly legacy_contract_status: string;
  readonly documentVersion: ContractDocumentVersion | null;
}

export interface ReviewQueuePage {
  readonly data: readonly ReviewQueueItem[];
  readonly nextCursor: string | null;
}

export interface AdministrativeDocumentDownload {
  readonly signatureCase: AdministrativeSignatureCase;
  readonly documentVersion: ContractDocumentVersion;
  readonly stream: Readable;
  readonly sizeBytes: number;
}

export type ContractSignatureCursor = {
  readonly occurredAt: string;
  readonly id: string;
};

export interface ContractSignaturePageOptions {
  readonly limit?: number;
  readonly cursor?: string;
}

export type ReviewInput = StartReviewInput;

export type ContractDecisionResult = ApprovalResult | RejectionResult;

export type PublicLinkAccessResult =
  | {
      readonly kind: "valid";
      readonly signatureCase: ContractSignatureCase;
      readonly deliveryAttempt: ContractDeliveryAttempt;
      readonly documentVersion: ContractDocumentVersion;
      readonly authenticatedRiderId: string | null;
    }
  | Exclude<ContractLinkResolution, { readonly kind: "valid" }>;

export type PublicOriginalDownloadResult =
  | (Extract<PublicLinkAccessResult, { readonly kind: "valid" }> & {
      readonly stream: Readable;
      readonly sizeBytes: number;
    })
  | Exclude<ContractLinkResolution, { readonly kind: "valid" }>;

export type PublicSignedUploadResult =
  | {
      readonly kind: "valid";
      readonly signatureCase: ContractSignatureCase;
      readonly deliveryAttempt: ContractDeliveryAttempt;
      readonly documentVersion: ContractDocumentVersion;
    }
  | Exclude<ContractLinkResolution, { readonly kind: "valid" }>;

export interface ContractEmailQueueInput {
  id: string;
  caseId: string;
  deliveryAttemptId: string | null;
  eventType: ContractEmailEventType;
  recipientEmail: string;
  subject: string;
  templateKey: string;
  payloadCiphertext: string;
  createdAt: string;
}

/**
 * Durable outbox hook. Implementations insert the supplied row in the
 * caller's transaction; they must not perform SMTP work synchronously.
 */
export interface ContractEmailService {
  queueContractEmail?(input: ContractEmailQueueInput): void;
}

export interface ContractSignatureMoleculeOptions {
  /** Base URL used by the encrypted outbox payload to build the Rider link. */
  publicLinkBaseUrl?: string;
  /** Clock used by public-link authorization and atomic state transitions. */
  now?: () => Date;
}

// ---------------------------------------------------------------------------
// Helper: buffer a stream up to limitBytes
// ---------------------------------------------------------------------------

async function bufferStream(
  stream: Readable | AsyncIterable<Uint8Array>,
  limitBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.from(chunk);
    total += buf.length;
    if (total > limitBytes) {
      throw new PdfValidationError("size_limit");
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// ContractSignatureMolecule
// ---------------------------------------------------------------------------

export class ContractSignatureMolecule implements IMolecule {
  readonly name = "contractSignatures";
  readonly version = "1.0.0";
  readonly description =
    "Contract signature flow: case creation, document upload, delivery and approval.";

  private readonly publicLinkBaseUrl: string;
  private readonly now: () => Date;

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
    private readonly storage: DocumentStorage,
    private readonly pdfValidator: PdfValidator,
    private readonly tokenService: TokenService,
    private readonly auditService: ContractAuditService,
    private readonly emailService?: ContractEmailService,
    options: ContractSignatureMoleculeOptions = {},
  ) {
    this.publicLinkBaseUrl = normalizePublicLinkBaseUrl(
      options.publicLinkBaseUrl ??
        process.env.CONTRACT_PUBLIC_BASE_URL ??
        "http://localhost:3000/public/contract-signatures",
    );
    this.now = options.now ?? (() => new Date());
  }

  // -------------------------------------------------------------------------
  // createCase
  // -------------------------------------------------------------------------

  createCase(input: CreateCaseInput): ContractSignatureCase {
    const { contractId, adminId } = input;

    // 1. Load contract
    const contract = this.db
      .prepare(
        "SELECT id, rider_id, motorcycle_id, status FROM rental_contracts WHERE id = ?",
      )
      .get(contractId) as ContractRow | undefined;

    if (!contract) {
      throw new NotFoundError("Contract", contractId);
    }

    // 2. Verify rider and motorcycle coherence
    const rider = this.db
      .prepare("SELECT id FROM riders WHERE id = ?")
      .get(contract.rider_id) as RiderRow | undefined;

    if (!rider) {
      throw new NotFoundError("Rider", contract.rider_id);
    }

    const motorcycle = this.db
      .prepare("SELECT id FROM motorcycles WHERE id = ?")
      .get(contract.motorcycle_id) as MotorcycleRow | undefined;

    if (!motorcycle) {
      throw new NotFoundError("Motorcycle", contract.motorcycle_id);
    }

    // 3. Reject terminal/incompatible legacy contract states
    if (contract.status === "cancelled" || contract.status === "expired") {
      throw new ConflictError("Contract is in a terminal state");
    }

    // 4. Prevent duplicate signature cases
    const existingCase = this.db
      .prepare("SELECT id FROM contract_signature_cases WHERE contract_id = ?")
      .get(contractId) as { id: string } | undefined;

    if (existingCase) {
      throw new ConflictError(
        "A signature case already exists for this contract",
      );
    }

    // 5. Verify admin exists
    const admin = this.db
      .prepare("SELECT id FROM admins WHERE id = ?")
      .get(adminId) as AdminRow | undefined;

    if (!admin) {
      throw new NotFoundError("Admin", adminId);
    }

    // 6. Insert case + audit in BEGIN IMMEDIATE transaction
    const caseId = uuidv4();
    const now = getCurrentUtcTimestamp();

    const insertAndAudit = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO contract_signature_cases
            (id, contract_id, rider_id, motorcycle_id,
             document_status, formalization_status,
             created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'preparado', 'pendiente_formalizacion', ?, ?, ?)`,
        )
        .run(
          caseId,
          contractId,
          contract.rider_id,
          contract.motorcycle_id,
          adminId,
          now,
          now,
        );

      this.auditService.record({
        eventType: "case_created",
        result: "success",
        actor: { type: "admin", id: adminId },
        caseId,
      });
    });

    (insertAndAudit as ReturnType<typeof this.db.transaction>).immediate();

    this.logger.info("Contract signature case created", {
      caseId,
      contractId,
      adminId,
    });

    return this.getCaseById(caseId) as ContractSignatureCase;
  }

  // -------------------------------------------------------------------------
  // uploadOriginalDocument
  // -------------------------------------------------------------------------

  async uploadOriginalDocument(
    input: UploadOriginalDocumentInput,
  ): Promise<UploadOriginalDocumentResult> {
    const { caseId, adminId, fileStream, originalFilename, declaredMimeType } =
      input;
    const safeFilename = normalizeDocumentFilename(originalFilename);

    // 1. Load case
    const signatureCase = this.getCaseById(caseId);
    if (!signatureCase) {
      throw new NotFoundError("SignatureCase", caseId);
    }

    // 2. Validate document_status allows an original upload/replacement
    const allowedStatuses: readonly DocumentStatus[] = [
      "preparado",
      "rechazado",
      "expirado",
    ];
    if (!allowedStatuses.includes(signatureCase.document_status)) {
      throw new ConflictError(
        `Cannot upload original document in state "${signatureCase.document_status}"`,
      );
    }

    // 3. Audit upload attempt (best-effort pre-flight)
    try {
      this.auditService.record({
        eventType: "original_upload_attempt",
        result: "success",
        actor: { type: "admin", id: adminId },
        caseId,
        metadata: { originalFilename: safeFilename },
      });
    } catch (auditError) {
      this.logger.warn("Failed to record original_upload_attempt audit event", {
        caseId,
        error:
          auditError instanceof Error ? auditError.message : String(auditError),
      });
    }

    // 4a. Buffer the stream and validate the PDF before writing to storage
    let bufferedBytes: Buffer;
    try {
      bufferedBytes = await bufferStream(
        fileStream,
        MAX_CONTRACT_DOCUMENT_BYTES,
      );
    } catch (error) {
      if (error instanceof PdfValidationError) {
        throw error;
      }
      throw error;
    }

    // 4b. Validate PDF (throws PdfValidationError on failure)
    const validatedPdf = await this.pdfValidator.validate({
      bytes: bufferedBytes,
      declaredMimeType,
    });

    // 4c. Write validated bytes to temporary storage
    let temporary: TemporaryDocument | undefined;
    const { Readable } = await import("node:stream");
    try {
      temporary = await this.storage.writeTemporary(
        Readable.from(bufferedBytes),
      );
    } catch (error) {
      if (error instanceof RepositoryCapacityError) {
        throw error;
      }
      throw error;
    }

    // 4d. Finalize: atomic rename + integrity check
    let storedDoc: StoredDocument;
    try {
      storedDoc = await this.storage.finalize(temporary);
    } catch (error) {
      // finalize cleans up the temporary on failure; just rethrow
      throw error;
    }

    // 5. DB transaction: insert version row, update case, audit success
    const versionId = uuidv4();
    const now = getCurrentUtcTimestamp();

    try {
      const commitWork = this.db.transaction(() => {
        // 5a. Compute next version_number
        const maxRow = this.db
          .prepare(
            "SELECT MAX(version_number) as max_version FROM contract_document_versions WHERE case_id = ?",
          )
          .get(caseId) as { max_version: number | null };
        const versionNumber = (maxRow.max_version ?? 0) + 1;

        // 5b. Insert document version
        this.db
          .prepare(
            `INSERT INTO contract_document_versions
              (id, case_id, version_number, kind, storage_key, storage_status,
               original_filename, mime_type, size_bytes, sha256,
               uploaded_by_type, uploaded_by_id,
               created_at, uploaded_at, updated_at)
             VALUES (?, ?, ?, 'original', ?, 'ready', ?, ?, ?, ?, 'admin', ?, ?, ?, ?)`,
          )
          .run(
            versionId,
            caseId,
            versionNumber,
            storedDoc.storageKey,
            safeFilename,
            validatedPdf.mimeType,
            storedDoc.sizeBytes,
            storedDoc.sha256,
            adminId,
            now,
            now,
            now,
          );

        // 5c. Update case
        this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET original_version_id = ?,
                    document_status = 'preparado',
                    updated_at = ?
              WHERE id = ?`,
          )
          .run(versionId, now, caseId);

        // 5d. Audit success events
        this.auditService.record({
          eventType: "original_uploaded",
          result: "success",
          actor: { type: "admin", id: adminId },
          caseId,
          documentVersionId: versionId,
          metadata: {
            originalFilename: safeFilename,
            sizeBytes: storedDoc.sizeBytes,
          },
        });

        this.auditService.record({
          eventType: "storage_finalized",
          result: "success",
          actor: { type: "system" },
          caseId,
          documentVersionId: versionId,
          metadata: { storageKey: storedDoc.storageKey },
        });
      });

      (commitWork as ReturnType<typeof this.db.transaction>).immediate();
    } catch (dbError) {
      // 5e. Quarantine the orphaned storage object and audit
      try {
        await this.storage.quarantine(storedDoc.storageKey);
        this.auditService.record({
          eventType: "storage_quarantined",
          result: "failure",
          actor: { type: "system" },
          caseId,
          metadata: { storageKey: storedDoc.storageKey },
          errorMessage:
            dbError instanceof Error ? dbError.message : String(dbError),
        });
      } catch (quarantineError) {
        this.logger.error(
          "Failed to quarantine storage object after DB error",
          {
            storageKey: storedDoc.storageKey,
            error:
              quarantineError instanceof Error
                ? quarantineError.message
                : String(quarantineError),
          },
        );
      }
      throw dbError;
    }

    this.logger.info("Original contract document uploaded", {
      caseId,
      versionId,
      storageKey: storedDoc.storageKey,
      adminId,
    });

    const updatedCase = this.getCaseById(caseId) as ContractSignatureCase;
    const documentVersion = this.getDocumentVersionById(
      versionId,
    ) as ContractDocumentVersion;

    return { signatureCase: updatedCase, documentVersion };
  }

  // -------------------------------------------------------------------------
  // uploadSignedDocument through a public delivery link
  // -------------------------------------------------------------------------

  async uploadSignedDocument(
    input: UploadSignedDocumentInput,
  ): Promise<PublicSignedUploadResult> {
    const {
      token,
      authenticatedRiderId,
      fileStream,
      originalFilename,
      declaredMimeType,
    } = input;
    const preflight = this.tokenService.resolve(token, authenticatedRiderId);

    if (preflight.kind !== "valid") {
      this.recordSignedUploadFailure(token, authenticatedRiderId, preflight);
      return preflight;
    }

    let temporary: TemporaryDocument | undefined;
    let storedDoc: StoredDocument | undefined;
    try {
      // Production adapters expose the temporary object so validation reads
      // exactly what the repository received. Legacy/fake adapters may not;
      // those are safely handled with the already bounded upload stream.
      let bufferedBytes: Buffer;
      if (this.storage.openTemporary) {
        temporary = await this.storage.writeTemporary(fileStream);
        const temporaryStream = await this.storage.openTemporary(temporary);
        bufferedBytes = await bufferStream(
          temporaryStream,
          MAX_CONTRACT_DOCUMENT_BYTES,
        );
      } else {
        bufferedBytes = await bufferStream(
          fileStream,
          MAX_CONTRACT_DOCUMENT_BYTES,
        );
        temporary = await this.storage.writeTemporary(
          Readable.from(bufferedBytes),
        );
      }

      const validatedPdf = await this.pdfValidator.validate({
        bytes: bufferedBytes,
        declaredMimeType,
      });

      storedDoc = await this.storage.finalize(temporary, (metadata) => {
        if (
          metadata.sizeBytes !== validatedPdf.sizeBytes ||
          metadata.sha256 !== validatedPdf.sha256
        ) {
          throw new Error("Final document integrity check failed");
        }
      });
      if (
        storedDoc.sizeBytes !== validatedPdf.sizeBytes ||
        storedDoc.sha256 !== validatedPdf.sha256
      ) {
        await this.storage.quarantine(storedDoc.storageKey);
        storedDoc = undefined;
        throw new Error("Final document integrity check failed");
      }

      const tokenHash = this.tokenService.hash(token);
      const operation = this.db.transaction(() => {
        const nowDate = this.now();
        if (Number.isNaN(nowDate.getTime())) {
          throw new Error("Contract signature clock returned an invalid date");
        }
        const now = nowDate.toISOString();
        const attempt = this.db
          .prepare(
            `SELECT attempts.id, attempts.case_id, attempts.document_version_id,
                    attempts.attempt_number, attempts.token_hash,
                    attempts.created_at, attempts.expires_at, attempts.revoked_at,
                    attempts.delivery_status, attempts.last_error, attempts.created_by,
                    cases.rider_id
               FROM contract_delivery_attempts AS attempts
               JOIN contract_signature_cases AS cases ON cases.id = attempts.case_id
              WHERE attempts.id = ?
                AND attempts.token_hash = ?
                AND attempts.revoked_at IS NULL
                AND attempts.expires_at > ?`,
          )
          .get(preflight.attemptId, tokenHash, now) as
          | (ContractDeliveryAttempt & { rider_id: string })
          | undefined;

        if (!attempt || attempt.rider_id !== preflight.riderId) {
          return this.resolveUploadTokenAt(now, tokenHash);
        }
        if (authenticatedRiderId && authenticatedRiderId !== attempt.rider_id) {
          return { kind: "invalid" as const };
        }

        const signatureCase = this.getCaseById(attempt.case_id);
        const originalVersion = this.getDocumentVersionById(
          attempt.document_version_id,
        );
        if (
          !signatureCase ||
          signatureCase.rider_id !== attempt.rider_id ||
          signatureCase.original_version_id !== originalVersion?.id ||
          originalVersion.kind !== "original" ||
          !["ready", "retained"].includes(originalVersion.storage_status) ||
          !["enviado", "accedido", "cargado"].includes(
            signatureCase.document_status,
          )
        ) {
          return { kind: "invalid" as const };
        }

        const maxRow = this.db
          .prepare(
            "SELECT MAX(version_number) AS max_version FROM contract_document_versions WHERE case_id = ?",
          )
          .get(attempt.case_id) as { max_version: number | null };
        const versionNumber = (maxRow.max_version ?? 0) + 1;
        const versionId = uuidv4();
        const safeFilename = normalizeDocumentFilename(originalFilename);

        this.db
          .prepare(
            `INSERT INTO contract_document_versions
              (id, case_id, version_number, kind, storage_key, storage_status,
               original_filename, mime_type, size_bytes, sha256,
               uploaded_by_type, uploaded_by_id,
               created_at, uploaded_at, updated_at)
             VALUES (?, ?, ?, 'signed', ?, 'ready', ?, ?, ?, ?, 'rider', ?, ?, ?, ?)`,
          )
          .run(
            versionId,
            attempt.case_id,
            versionNumber,
            storedDoc!.storageKey,
            safeFilename,
            "application/pdf",
            storedDoc!.sizeBytes,
            storedDoc!.sha256,
            authenticatedRiderId ?? null,
            now,
            now,
            now,
          );

        this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET current_signed_version_id = ?,
                    document_status = 'cargado',
                    updated_at = ?
              WHERE id = ?`,
          )
          .run(versionId, now, attempt.case_id);

        const adminEmail = this.getAdminNotificationEmail();
        if (!adminEmail) {
          throw new ConflictError(
            "No administrative notification recipient is configured",
          );
        }
        const queueInput: ContractEmailQueueInput = {
          id: uuidv4(),
          caseId: attempt.case_id,
          deliveryAttemptId: attempt.id,
          eventType: "signed_document_available",
          recipientEmail: adminEmail,
          subject: "A signed MotoFleet contract is ready for review",
          templateKey: "signed_document_available",
          payloadCiphertext: this.tokenService.encryptOutboxPayload({
            eventType: "signed_document_available",
            caseId: attempt.case_id,
            contractId: signatureCase.contract_id,
            riderId: signatureCase.rider_id,
            documentVersionId: versionId,
            deliveryAttemptId: attempt.id,
            createdAt: now,
          }),
          createdAt: now,
        };

        if (this.emailService?.queueContractEmail) {
          this.emailService.queueContractEmail(queueInput);
        } else {
          this.db
            .prepare(
              `INSERT INTO contract_email_queue
                 (id, case_id, delivery_attempt_id, event_type, recipient_email,
                  subject, template_key, payload_ciphertext, status, attempts, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
            )
            .run(
              queueInput.id,
              queueInput.caseId,
              queueInput.deliveryAttemptId,
              queueInput.eventType,
              queueInput.recipientEmail,
              queueInput.subject,
              queueInput.templateKey,
              queueInput.payloadCiphertext,
              queueInput.createdAt,
            );
        }

        this.auditService.record({
          eventType: "signed_uploaded",
          result: "success",
          actor: authenticatedRiderId
            ? { type: "rider", id: authenticatedRiderId }
            : { type: "token" },
          caseId: attempt.case_id,
          documentVersionId: versionId,
          deliveryAttemptId: attempt.id,
          metadata: { sizeBytes: storedDoc!.sizeBytes },
        });
        this.auditService.record({
          eventType: "storage_finalized",
          result: "success",
          actor: { type: "system" },
          caseId: attempt.case_id,
          documentVersionId: versionId,
          metadata: { storageKey: storedDoc!.storageKey },
        });

        return {
          kind: "valid" as const,
          caseId: attempt.case_id,
          attemptId: attempt.id,
          versionId,
        };
      });

      const outcome = (
        operation as ReturnType<typeof this.db.transaction>
      ).immediate() as
        | {
            readonly kind: "valid";
            readonly caseId: string;
            readonly attemptId: string;
            readonly versionId: string;
          }
        | Exclude<ContractLinkResolution, { readonly kind: "valid" }>;

      if (outcome.kind !== "valid") {
        await this.storage
          .quarantine(storedDoc.storageKey)
          .catch(() => undefined);
        this.recordSignedUploadFailure(
          token,
          authenticatedRiderId,
          outcome,
          preflight.caseId,
          preflight.attemptId,
        );
        return outcome;
      }

      const documentVersion = this.getDocumentVersionById(outcome.versionId);
      const signatureCase = this.getCaseById(outcome.caseId);
      const deliveryAttempt = this.getDeliveryAttemptById(outcome.attemptId);
      if (!documentVersion || !signatureCase || !deliveryAttempt) {
        throw new Error("Signed document upload was not persisted");
      }
      return { kind: "valid", signatureCase, deliveryAttempt, documentVersion };
    } catch (error) {
      if (temporary) {
        await this.storage.discardTemporary(temporary).catch(() => undefined);
      }
      if (storedDoc) {
        await this.storage
          .quarantine(storedDoc.storageKey)
          .catch(() => undefined);
      }
      this.recordSignedUploadFailure(
        token,
        authenticatedRiderId,
        preflight,
        preflight.caseId,
        preflight.attemptId,
        error,
      );
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // send / resend
  // -------------------------------------------------------------------------

  /** Queues the first delivery for a prepared signature case. */
  send(input: SendContractInput): SendContractResult {
    return this.queueDelivery(input, "send");
  }

  /** Revokes the current link and queues a fresh delivery attempt. */
  resend(input: SendContractInput): SendContractResult {
    return this.queueDelivery(input, "resend");
  }

  // Explicit names are useful to route adapters and preserve a readable API.
  sendContract(input: SendContractInput): SendContractResult {
    return this.send(input);
  }

  resendContract(input: SendContractInput): SendContractResult {
    return this.resend(input);
  }

  private queueDelivery(
    input: SendContractInput,
    mode: "send" | "resend",
  ): SendContractResult {
    const { caseId, adminId } = input;
    const operation = this.db.transaction(() => {
      const context = this.db
        .prepare(
          `SELECT cases.id AS case_id,
                  cases.contract_id,
                  cases.rider_id,
                  cases.document_status,
                  cases.formalization_status,
                  cases.original_version_id,
                  riders.email AS rider_email,
                  contracts.status AS legacy_contract_status,
                  original.kind AS original_kind,
                  original.storage_status AS original_storage_status
             FROM contract_signature_cases AS cases
             JOIN rental_contracts AS contracts ON contracts.id = cases.contract_id
             JOIN riders ON riders.id = cases.rider_id
             LEFT JOIN contract_document_versions AS original
               ON original.id = cases.original_version_id
            WHERE cases.id = ?`,
        )
        .get(caseId) as DeliveryContextRow | undefined;

      if (!context) {
        throw new NotFoundError("SignatureCase", caseId);
      }

      const admin = this.db
        .prepare("SELECT id FROM admins WHERE id = ?")
        .get(adminId) as AdminRow | undefined;
      if (!admin) {
        throw new NotFoundError("Admin", adminId);
      }

      if (mode === "send" && context.document_status !== "preparado") {
        throw new ConflictError(
          `Cannot send a contract from state "${context.document_status}"`,
        );
      }

      // A resend is still a normal document transition, but an approved
      // document, a cancelled formalization, or a terminal legacy contract
      // must never receive another link.
      if (context.document_status === "aprobado") {
        throw new ConflictError("Approved signature cases cannot be resent");
      }
      if (context.formalization_status === "cancelado") {
        throw new ConflictError("Cancelled signature cases cannot be resent");
      }
      if (
        ["expired", "renewed", "cancelled"].includes(
          context.legacy_contract_status,
        )
      ) {
        throw new ConflictError(
          "Contracts in a terminal state cannot be resent",
        );
      }

      try {
        assertDocumentTransition(context.document_status, "enviado");
      } catch (error) {
        if (error instanceof ConflictError) throw error;
        throw new ConflictError(
          `Cannot send a contract from state "${context.document_status}"`,
        );
      }

      if (
        !context.original_version_id ||
        context.original_kind !== "original" ||
        !["ready", "retained"].includes(context.original_storage_status ?? "")
      ) {
        throw new ConflictError(
          "A valid original document is required before sending",
        );
      }
      if (!context.rider_email?.trim()) {
        throw new ConflictError("The Rider has no registered email address");
      }

      const currentAttempts = this.db
        .prepare(
          `SELECT id, case_id, document_version_id, attempt_number, token_hash,
                  created_at, expires_at, revoked_at, delivery_status, last_error,
                  created_by
             FROM contract_delivery_attempts
            WHERE case_id = ? AND revoked_at IS NULL
            ORDER BY attempt_number DESC`,
        )
        .all(caseId) as DeliveryAttemptRow[];

      if (mode === "resend" && currentAttempts.length === 0) {
        throw new ConflictError(
          "A delivery attempt is required before resending",
        );
      }

      // Revoke every currently-live attempt, not just the newest row. This
      // repairs any pre-existing duplicate-live-attempt anomaly atomically.
      const revokeAttempt = this.db.prepare(
        `UPDATE contract_delivery_attempts
            SET revoked_at = ?
          WHERE id = ? AND revoked_at IS NULL`,
      );
      for (const previous of currentAttempts) {
        revokeAttempt.run(getCurrentUtcTimestamp(), previous.id);
        this.auditService.record({
          eventType: "link_revoked",
          result: "success",
          actor: { type: "admin", id: adminId },
          caseId,
          documentVersionId: previous.document_version_id,
          deliveryAttemptId: previous.id,
          metadata: { reason: "new_delivery_attempt" },
        });
      }

      const generated = this.tokenService.generate();
      const attemptId = uuidv4();
      const outboxId = uuidv4();
      const eventType: ContractEmailEventType =
        mode === "send" ? "contract_sent" : "contract_resent";
      const attemptNumberRow = this.db
        .prepare(
          "SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt FROM contract_delivery_attempts WHERE case_id = ?",
        )
        .get(caseId) as { max_attempt: number };
      const attemptNumber = attemptNumberRow.max_attempt + 1;

      // The raw token only exists in this in-memory payload. The durable row
      // receives an authenticated encrypted envelope, never the token itself.
      const payloadCiphertext = this.tokenService.encryptOutboxPayload({
        token: generated.plaintext,
        link: `${this.publicLinkBaseUrl}/${encodeURIComponent(generated.plaintext)}`,
        caseId,
        contractId: context.contract_id,
        riderId: context.rider_id,
        documentVersionId: context.original_version_id,
        attemptId,
        expiresAt: generated.expiresAt,
        eventType,
      });

      this.db
        .prepare(
          `INSERT INTO contract_delivery_attempts
             (id, case_id, document_version_id, attempt_number, token_hash,
              created_at, expires_at, delivery_status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?)`,
        )
        .run(
          attemptId,
          caseId,
          context.original_version_id,
          attemptNumber,
          generated.tokenHash,
          generated.createdAt,
          generated.expiresAt,
          adminId,
        );

      const queueInput: ContractEmailQueueInput = {
        id: outboxId,
        caseId,
        deliveryAttemptId: attemptId,
        eventType,
        recipientEmail: context.rider_email.trim(),
        subject:
          mode === "send"
            ? "Your MotoFleet contract is ready to sign"
            : "Your MotoFleet contract link was resent",
        templateKey: eventType,
        payloadCiphertext,
        createdAt: generated.createdAt,
      };

      if (this.emailService?.queueContractEmail) {
        this.emailService.queueContractEmail(queueInput);
      } else {
        this.db
          .prepare(
            `INSERT INTO contract_email_queue
               (id, case_id, delivery_attempt_id, event_type, recipient_email,
                subject, template_key, payload_ciphertext, status, attempts, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
          )
          .run(
            queueInput.id,
            queueInput.caseId,
            queueInput.deliveryAttemptId,
            queueInput.eventType,
            queueInput.recipientEmail,
            queueInput.subject,
            queueInput.templateKey,
            queueInput.payloadCiphertext,
            queueInput.createdAt,
          );
      }

      const now = generated.createdAt;
      this.db
        .prepare(
          `UPDATE contract_signature_cases
              SET document_status = 'enviado',
                  delivery_attention = 'pending',
                  updated_at = ?
            WHERE id = ?`,
        )
        .run(now, caseId);

      this.auditService.record({
        eventType: "send_queued",
        result: "success",
        actor: { type: "admin", id: adminId },
        caseId,
        documentVersionId: context.original_version_id,
        deliveryAttemptId: attemptId,
        metadata: {
          eventType,
          attemptNumber,
          expiresAt: generated.expiresAt,
        },
      });

      return { attemptId };
    });

    const transactionResult = (
      operation as ReturnType<typeof this.db.transaction>
    ).immediate() as { attemptId: string };
    const deliveryAttempt = this.getDeliveryAttemptById(
      transactionResult.attemptId,
    );
    if (!deliveryAttempt) {
      throw new Error("Delivery attempt was not persisted");
    }

    this.logger.info("Contract delivery queued", {
      caseId,
      attemptId: deliveryAttempt.id,
      attemptNumber: deliveryAttempt.attempt_number,
      eventType: mode === "send" ? "contract_sent" : "contract_resent",
    });

    return {
      signatureCase: this.getCaseById(caseId) as ContractSignatureCase,
      deliveryAttempt,
    };
  }

  /**
   * Starts the administrative review without changing any document timestamp.
   * The immediate transaction serializes this selection with signed uploads.
   */
  startReview(input: StartReviewInput): ReviewStartResult {
    const { caseId, adminId } = input;
    try {
      const operation = this.db.transaction(() => {
        const signatureCase = this.db
          .prepare("SELECT * FROM contract_signature_cases WHERE id = ?")
          .get(caseId) as ContractSignatureCase | undefined;
        if (!signatureCase) throw new NotFoundError("SignatureCase", caseId);

        this.assertAdminExists(adminId);
        assertDocumentTransition(signatureCase.document_status, "en_revision");

        const latestSigned = this.db
          .prepare(
            `SELECT *
               FROM contract_document_versions
              WHERE case_id = ?
                AND kind = 'signed'
                AND storage_status IN ('ready', 'retained')
              ORDER BY version_number DESC
              LIMIT 1`,
          )
          .get(caseId) as ContractDocumentVersion | undefined;
        if (!latestSigned) {
          throw new ConflictError(
            "A valid signed document is required before review",
          );
        }

        const now = this.utcNow();
        this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET current_signed_version_id = ?,
                    reviewed_version_id = ?,
                    document_status = 'en_revision',
                    updated_at = ?
              WHERE id = ? AND document_status = 'cargado'`,
          )
          .run(latestSigned.id, latestSigned.id, now, caseId);

        this.auditService.record({
          eventType: "review_started",
          result: "success",
          actor: { type: "admin", id: adminId },
          caseId,
          documentVersionId: latestSigned.id,
          metadata: { previousDocumentStatus: "cargado" },
        });

        return { versionId: latestSigned.id };
      });

      const result = (
        operation as ReturnType<typeof this.db.transaction>
      ).immediate() as { versionId: string };
      const signatureCase = this.getCaseById(caseId);
      const documentVersion = this.getDocumentVersionById(result.versionId);
      if (!signatureCase || !documentVersion) {
        throw new Error("Review transition was not persisted");
      }
      return { signatureCase, documentVersion };
    } catch (error) {
      this.recordTransitionFailure(
        "review_start",
        caseId,
        adminId,
        undefined,
        error,
      );
      throw error;
    }
  }

  /** Alias retained for route adapters that use the route operation name. */
  reviewStart(input: StartReviewInput): ReviewStartResult {
    return this.startReview(input);
  }

  /**
   * Records one immutable manual verification. Verifications are deliberately
   * not upserts: an unsatisfactory result remains the latest result that an
   * approval must observe.
   */
  verify(input: ManualVerificationInput): ManualVerificationResult {
    const { caseId, adminId } = input;
    const versionId = input.versionId ?? input.version_id;
    const comments =
      input.comments === null || input.comments === undefined
        ? null
        : input.comments.trim();

    try {
      if (!versionId?.trim()) {
        throw new ValidationError("A document version is required", {
          version_id: ["required"],
        });
      }
      if (
        input.result !== "satisfactory" &&
        input.result !== "unsatisfactory"
      ) {
        throw new ValidationError("Verification result is invalid", {
          result: ["invalid"],
        });
      }
      if (comments !== null && comments.length > 2000) {
        throw new ValidationError("Comments must be at most 2000 characters", {
          comments: ["max_length"],
        });
      }

      const operation = this.db.transaction(() => {
        const signatureCase = this.db
          .prepare("SELECT * FROM contract_signature_cases WHERE id = ?")
          .get(caseId) as ContractSignatureCase | undefined;
        if (!signatureCase) throw new NotFoundError("SignatureCase", caseId);

        this.assertAdminExists(adminId);
        if (signatureCase.document_status !== "en_revision") {
          throw new ConflictError(
            `Cannot verify a contract from state "${signatureCase.document_status}"`,
          );
        }

        const documentVersion = this.db
          .prepare(
            `SELECT *
               FROM contract_document_versions
              WHERE id = ? AND case_id = ?`,
          )
          .get(versionId, caseId) as ContractDocumentVersion | undefined;
        if (
          !documentVersion ||
          documentVersion.kind !== "signed" ||
          !["ready", "retained"].includes(documentVersion.storage_status)
        ) {
          throw new ConflictError(
            "Verification requires a valid signed document from this case",
          );
        }

        const verificationId = uuidv4();
        const createdAt = this.utcNow();
        this.db
          .prepare(
            `INSERT INTO contract_verifications
               (id, case_id, document_version_id, admin_id, result, comments, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            verificationId,
            caseId,
            documentVersion.id,
            adminId,
            input.result,
            comments,
            createdAt,
          );
        this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET reviewed_version_id = ?, updated_at = ?
              WHERE id = ?`,
          )
          .run(documentVersion.id, createdAt, caseId);

        this.auditService.record({
          eventType: "manual_verification",
          result: "success",
          actor: { type: "admin", id: adminId },
          caseId,
          documentVersionId: documentVersion.id,
          metadata: { result: input.result, comments },
        });

        return {
          verification: {
            id: verificationId,
            case_id: caseId,
            document_version_id: documentVersion.id,
            admin_id: adminId,
            result: input.result as VerificationResult,
            comments,
            created_at: createdAt,
          },
          versionId: documentVersion.id,
        };
      });

      const result = (
        operation as ReturnType<typeof this.db.transaction>
      ).immediate() as {
        verification: ContractVerification;
        versionId: string;
      };
      const signatureCase = this.getCaseById(caseId);
      const documentVersion = this.getDocumentVersionById(result.versionId);
      if (!signatureCase || !documentVersion) {
        throw new Error("Manual verification was not persisted");
      }
      return {
        signatureCase,
        documentVersion,
        verification: result.verification,
      };
    } catch (error) {
      this.recordTransitionFailure("verify", caseId, adminId, versionId, error);
      throw error;
    }
  }

  /**
   * Approves only the exact current signed version. Storage is checked before
   * the SQLite lock because DocumentStorage is asynchronous; the immutable
   * stat result is then compared again with the exact row inside BEGIN
   * IMMEDIATE. Any later failure rolls back state, audit success and outbox.
   */
  async approve(input: ApprovalInput): Promise<ApprovalResult> {
    const { caseId, adminId } = input;
    const versionId = input.versionId ?? input.version_id;
    let storageMetadata: { sizeBytes: number; sha256: string } | null = null;
    const preflightVersion = versionId
      ? this.getDocumentVersionById(versionId)
      : null;
    if (
      preflightVersion &&
      preflightVersion.case_id === caseId &&
      preflightVersion.kind === "signed" &&
      ["ready", "retained"].includes(preflightVersion.storage_status)
    ) {
      try {
        storageMetadata = await this.storage.stat(preflightVersion.storage_key);
      } catch {
        storageMetadata = null;
      }
    }

    try {
      const operation = this.db.transaction(() => {
        const context = this.db
          .prepare(
            `SELECT cases.*, riders.email AS rider_email
               FROM contract_signature_cases AS cases
               JOIN riders ON riders.id = cases.rider_id
              WHERE cases.id = ?`,
          )
          .get(caseId) as
          | (ContractSignatureCase & { rider_email: string })
          | undefined;
        if (!context) throw new NotFoundError("SignatureCase", caseId);

        this.assertAdminExists(adminId);
        if (context.document_status !== "en_revision") {
          throw new ConflictError(
            `Cannot approve a contract from state "${context.document_status}"`,
          );
        }
        if (context.formalization_status !== "pendiente_formalizacion") {
          throw new ConflictError("Only pending formalization can be approved");
        }

        const requestedVersion = versionId?.trim()
          ? (this.db
              .prepare(
                `SELECT *
                   FROM contract_document_versions
                  WHERE id = ? AND case_id = ?`,
              )
              .get(versionId, caseId) as ContractDocumentVersion | undefined)
          : undefined;
        const currentValidVersion = this.db
          .prepare(
            `SELECT *
               FROM contract_document_versions
              WHERE case_id = ?
                AND kind = 'signed'
                AND storage_status IN ('ready', 'retained')
              ORDER BY version_number DESC
              LIMIT 1`,
          )
          .get(caseId) as ContractDocumentVersion | undefined;

        const requestedIsCurrentValid = Boolean(
          requestedVersion &&
          requestedVersion.id === context.current_signed_version_id &&
          requestedVersion.kind === "signed" &&
          ["ready", "retained"].includes(requestedVersion.storage_status) &&
          currentValidVersion?.id === requestedVersion.id &&
          storageMetadata &&
          storageMetadata.sizeBytes === requestedVersion.size_bytes &&
          storageMetadata.sha256 === requestedVersion.sha256,
        );
        if (!requestedIsCurrentValid) {
          throw new ConflictError(
            "Approval requires the exact current signed PDF to be available",
          );
        }

        const latestVerification = this.db
          .prepare(
            `SELECT result
               FROM contract_verifications
              WHERE case_id = ? AND document_version_id = ?
              ORDER BY created_at DESC, id DESC
              LIMIT 1`,
          )
          .get(caseId, requestedVersion!.id) as
          | { result: VerificationResult }
          | undefined;
        if (
          !latestVerification ||
          latestVerification.result !== "satisfactory"
        ) {
          throw new ConflictError(
            "Approval requires a latest satisfactory verification for the current signed version",
          );
        }

        assertDocumentTransition(context.document_status, "aprobado");
        assertFormalizationTransition(context.formalization_status, "activo", {
          approved: true,
        });
        const formalizedAt = this.utcNow();
        if (!context.rider_email?.trim()) {
          throw new ConflictError("The Rider has no registered email address");
        }

        const outboxId = this.queueDecisionEmail({
          caseId,
          contractId: context.contract_id,
          riderId: context.rider_id,
          documentVersionId: requestedVersion!.id,
          eventType: "contract_approved",
          recipientEmail: context.rider_email.trim(),
          subject: "Your MotoFleet contract was approved",
          payload: {
            eventType: "contract_approved",
            caseId,
            contractId: context.contract_id,
            riderId: context.rider_id,
            documentVersionId: requestedVersion!.id,
            documentStatus: "aprobado",
            formalizationStatus: "activo",
            formalizedAt,
          },
          createdAt: formalizedAt,
        });

        this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET document_status = 'aprobado',
                    formalization_status = 'activo',
                    formalized_at = ?,
                    updated_at = ?
              WHERE id = ?`,
          )
          .run(formalizedAt, formalizedAt, caseId);

        this.auditService.record({
          eventType: "approved",
          result: "success",
          actor: { type: "admin", id: adminId },
          caseId,
          documentVersionId: requestedVersion!.id,
          metadata: {
            formalizationStatus: "activo",
            formalizedAt,
            outboxId,
          },
        });

        return { versionId: requestedVersion!.id, formalizedAt };
      });

      const result = (
        operation as ReturnType<typeof this.db.transaction>
      ).immediate() as { versionId: string; formalizedAt: string };
      const signatureCase = this.getCaseById(caseId);
      const documentVersion = this.getDocumentVersionById(result.versionId);
      if (!signatureCase || !documentVersion) {
        throw new Error("Approval transition was not persisted");
      }
      return {
        signatureCase,
        documentVersion,
        formalizedAt: result.formalizedAt,
      };
    } catch (error) {
      this.recordTransitionFailure(
        "approve",
        caseId,
        adminId,
        versionId,
        error,
      );
      throw error;
    }
  }

  /** Alias retained for adapters that name the action explicitly. */
  approveContract(input: ApprovalInput): Promise<ApprovalResult> {
    return this.approve(input);
  }

  /** Rejects the current reviewed document while preserving all versions. */
  reject(input: RejectionInput): RejectionResult {
    const { caseId, adminId } = input;
    const normalizedForCount =
      typeof input.reason === "string"
        ? input.reason.trim().replace(/\s+/g, " ")
        : "";
    const storedReason =
      typeof input.reason === "string" ? input.reason.trim() : "";

    try {
      if (normalizedForCount.length < 10 || normalizedForCount.length > 500) {
        throw new ValidationError(
          "Rejection reason must contain between 10 and 500 characters",
          { reason: ["length"] },
        );
      }

      const operation = this.db.transaction(() => {
        const context = this.db
          .prepare("SELECT * FROM contract_signature_cases WHERE id = ?")
          .get(caseId) as ContractSignatureCase | undefined;
        if (!context) throw new NotFoundError("SignatureCase", caseId);

        this.assertAdminExists(adminId);
        if (context.document_status !== "en_revision") {
          throw new ConflictError(
            `Cannot reject a contract from state "${context.document_status}"`,
          );
        }
        if (context.formalization_status !== "pendiente_formalizacion") {
          throw new ConflictError(
            "Rejected documents must remain pending formalization",
          );
        }

        const currentVersion = context.current_signed_version_id
          ? (this.db
              .prepare(
                `SELECT *
                   FROM contract_document_versions
                  WHERE id = ? AND case_id = ?`,
              )
              .get(context.current_signed_version_id, caseId) as
              | ContractDocumentVersion
              | undefined)
          : undefined;
        if (
          !currentVersion ||
          currentVersion.kind !== "signed" ||
          !["ready", "retained"].includes(currentVersion.storage_status)
        ) {
          throw new ConflictError(
            "Rejection requires a signed document currently under review",
          );
        }

        assertDocumentTransition(context.document_status, "rechazado");
        const now = this.utcNow();
        const rider = this.db
          .prepare("SELECT email FROM riders WHERE id = ?")
          .get(context.rider_id) as { email: string } | undefined;
        if (!rider?.email?.trim()) {
          throw new ConflictError("The Rider has no registered email address");
        }

        const outboxId = this.queueDecisionEmail({
          caseId,
          contractId: context.contract_id,
          riderId: context.rider_id,
          documentVersionId: currentVersion.id,
          eventType: "contract_rejected",
          recipientEmail: rider.email.trim(),
          subject: "Correction required for your MotoFleet contract",
          payload: {
            eventType: "contract_rejected",
            caseId,
            contractId: context.contract_id,
            riderId: context.rider_id,
            documentVersionId: currentVersion.id,
            documentStatus: "rechazado",
            formalizationStatus: "pendiente_formalizacion",
            reason: storedReason,
            correctiveAction:
              "Upload a corrected signed PDF using a new delivery link.",
          },
          createdAt: now,
        });

        this.db
          .prepare(
            `UPDATE contract_signature_cases
                SET document_status = 'rechazado',
                    formalization_status = 'pendiente_formalizacion',
                    updated_at = ?
              WHERE id = ?`,
          )
          .run(now, caseId);

        this.auditService.record({
          eventType: "rejected",
          result: "success",
          actor: { type: "admin", id: adminId },
          caseId,
          documentVersionId: currentVersion.id,
          metadata: { reason: storedReason, outboxId },
        });

        return { versionId: currentVersion.id, reason: storedReason };
      });

      const result = (
        operation as ReturnType<typeof this.db.transaction>
      ).immediate() as { versionId: string; reason: string };
      const signatureCase = this.getCaseById(caseId);
      const documentVersion = this.getDocumentVersionById(result.versionId);
      if (!signatureCase || !documentVersion) {
        throw new Error("Rejection transition was not persisted");
      }
      return {
        signatureCase,
        documentVersion,
        reason: result.reason,
      };
    } catch (error) {
      this.recordTransitionFailure("reject", caseId, adminId, undefined, error);
      throw error;
    }
  }

  /** Alias retained for adapters that name the action explicitly. */
  rejectContract(input: RejectionInput): RejectionResult {
    return this.reject(input);
  }

  /**
   * Resolves a public bearer link and records the access atomically. The
   * token is accepted only at this boundary; neither the result nor audit
   * metadata contains its plaintext value.
   */
  resolvePublicContractLink(
    token: string,
    authenticatedRiderId?: string,
  ): PublicLinkAccessResult {
    return this.resolvePublicContractLinkInternal(
      token,
      authenticatedRiderId,
      true,
    );
  }

  /**
   * Authorizes a bearer link for a public operation. A download reuses this
   * exact authorization and state transition, but does not count as another
   * link-page access; it records its own document_download event instead.
   */
  private resolvePublicContractLinkInternal(
    token: string,
    authenticatedRiderId: string | undefined,
    recordAccessAudit: boolean,
  ): PublicLinkAccessResult {
    const resolution = this.tokenService.resolve(token, authenticatedRiderId);
    if (resolution.kind !== "valid") {
      this.recordPublicLinkFailure(token, resolution, authenticatedRiderId);
      return resolution;
    }

    const tokenHash = this.tokenService.hash(token);
    const now = this.now();
    if (Number.isNaN(now.getTime())) {
      throw new Error("Contract signature clock returned an invalid date");
    }
    const nowIso = now.toISOString();
    const operation = this.db.transaction(() => {
      const attempt = this.db
        .prepare(
          `SELECT attempts.id, attempts.case_id, attempts.document_version_id,
                  attempts.attempt_number, attempts.token_hash,
                  attempts.created_at, attempts.expires_at, attempts.revoked_at,
                  attempts.delivery_status, attempts.last_error, attempts.created_by,
                  cases.rider_id
             FROM contract_delivery_attempts AS attempts
             JOIN contract_signature_cases AS cases ON cases.id = attempts.case_id
            WHERE attempts.id = ?
              AND attempts.token_hash = ?
              AND attempts.revoked_at IS NULL
              AND attempts.expires_at > ?`,
        )
        .get(resolution.attemptId, tokenHash, nowIso) as
        | (ContractDeliveryAttempt & { rider_id: string })
        | undefined;

      if (!attempt || attempt.rider_id !== resolution.riderId) return null;
      if (authenticatedRiderId && authenticatedRiderId !== attempt.rider_id) {
        return null;
      }

      const signatureCase = this.getCaseById(attempt.case_id);
      const documentVersion = this.getDocumentVersionById(
        attempt.document_version_id,
      );
      if (
        !signatureCase ||
        !documentVersion ||
        signatureCase.original_version_id !== documentVersion.id ||
        documentVersion.kind !== "original"
      ) {
        return null;
      }

      // Only the initial enviado -> accedido transition is allowed here. A
      // later state (cargado/en_revision/aprobado/etc.) is never downgraded.
      const transition = this.db
        .prepare(
          `UPDATE contract_signature_cases
              SET document_status = 'accedido', updated_at = ?
            WHERE id = ? AND document_status = 'enviado'`,
        )
        .run(nowIso, signatureCase.id);

      const updatedCase = this.getCaseById(signatureCase.id);
      if (!updatedCase) return null;

      if (recordAccessAudit) {
        this.auditService.record({
          eventType: "link_access",
          result: "success",
          actor: authenticatedRiderId
            ? { type: "rider", id: authenticatedRiderId }
            : { type: "token" },
          caseId: updatedCase.id,
          documentVersionId: documentVersion.id,
          deliveryAttemptId: attempt.id,
          metadata: { firstAccess: transition.changes === 1 },
        });
      }

      return {
        kind: "valid" as const,
        signatureCase: updatedCase,
        deliveryAttempt: attempt,
        documentVersion,
        authenticatedRiderId: authenticatedRiderId ?? null,
      };
    });

    const result = (
      operation as ReturnType<typeof this.db.transaction>
    ).immediate() as PublicLinkAccessResult | null;
    if (result) return result;

    // A concurrent resend/revocation or an inconsistent reference must look
    // exactly like any other unavailable public link.
    const invalid: Exclude<ContractLinkResolution, { readonly kind: "valid" }> =
      {
        kind: "invalid",
      };
    this.recordPublicLinkFailure(token, invalid, authenticatedRiderId);
    return invalid;
  }

  /** Returns the minimal public link state used by GET /public/.../:token. */
  getPublicContract(
    token: string,
    authenticatedRiderId?: string,
  ): PublicLinkAccessResult {
    return this.resolvePublicContractLink(token, authenticatedRiderId);
  }

  /**
   * Authorizes and opens only the original version bound to the resolved
   * delivery attempt. Storage metadata is checked before any bytes are sent.
   */
  async downloadPublicOriginal(
    token: string,
    authenticatedRiderId?: string,
  ): Promise<PublicOriginalDownloadResult> {
    const access = this.resolvePublicContractLinkInternal(
      token,
      authenticatedRiderId,
      false,
    );
    if (access.kind !== "valid") return access;

    const version = access.documentVersion;
    if (
      version.id !== access.signatureCase.original_version_id ||
      version.id !== access.deliveryAttempt.document_version_id ||
      version.kind !== "original" ||
      (version.storage_status !== "ready" &&
        version.storage_status !== "retained")
    ) {
      this.recordPublicDownloadAudit(access, "failure", "document_unavailable");
      return { kind: "invalid" };
    }

    let storageMetadata;
    try {
      storageMetadata = await this.storage.stat(version.storage_key);
    } catch {
      storageMetadata = null;
    }

    if (
      !storageMetadata ||
      storageMetadata.sizeBytes !== version.size_bytes ||
      storageMetadata.sha256 !== version.sha256
    ) {
      this.recordPublicDownloadAudit(access, "failure", "document_unavailable");
      return { kind: "invalid" };
    }

    let stream: Readable;
    try {
      stream = await this.storage.openRead(
        version.storage_key,
        version.storage_status,
      );
    } catch {
      this.recordPublicDownloadAudit(access, "failure", "document_unavailable");
      return { kind: "invalid" };
    }

    this.recordPublicDownloadAudit(access, "success");
    stream.once("error", () => {
      this.recordPublicDownloadAudit(access, "failure", "stream_failed");
    });

    return { ...access, stream, sizeBytes: storageMetadata.sizeBytes };
  }

  private resolveUploadTokenAt(
    now: string,
    tokenHash: string,
  ): Exclude<ContractLinkResolution, { readonly kind: "valid" }> {
    const expired = this.db
      .prepare(
        `SELECT expires_at
           FROM contract_delivery_attempts
          WHERE token_hash = ?
            AND revoked_at IS NULL
            AND expires_at <= ?
          LIMIT 1`,
      )
      .get(tokenHash, now) as { expires_at: string } | undefined;
    return expired
      ? { kind: "expired", expiresAt: expired.expires_at }
      : { kind: "invalid" };
  }

  private utcNow(): string {
    const now = this.now();
    if (Number.isNaN(now.getTime())) {
      throw new Error("Contract signature clock returned an invalid date");
    }
    return now.toISOString();
  }

  private assertAdminExists(adminId: string): void {
    const admin = this.db
      .prepare("SELECT id FROM admins WHERE id = ?")
      .get(adminId) as AdminRow | undefined;
    if (!admin) throw new NotFoundError("Admin", adminId);
  }

  /** Enqueues a decision notification without doing SMTP work in the transaction. */
  private queueDecisionEmail(input: {
    caseId: string;
    contractId: string;
    riderId: string;
    documentVersionId: string;
    eventType: Extract<
      ContractEmailEventType,
      "contract_approved" | "contract_rejected"
    >;
    recipientEmail: string;
    subject: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }): string {
    const queueInput: ContractEmailQueueInput = {
      id: uuidv4(),
      caseId: input.caseId,
      deliveryAttemptId: null,
      eventType: input.eventType,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      templateKey: input.eventType,
      payloadCiphertext: this.tokenService.encryptOutboxPayload(input.payload),
      createdAt: input.createdAt,
    };

    if (this.emailService?.queueContractEmail) {
      this.emailService.queueContractEmail(queueInput);
    } else {
      this.db
        .prepare(
          `INSERT INTO contract_email_queue
             (id, case_id, delivery_attempt_id, event_type, recipient_email,
              subject, template_key, payload_ciphertext, status, attempts, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
        )
        .run(
          queueInput.id,
          queueInput.caseId,
          queueInput.deliveryAttemptId,
          queueInput.eventType,
          queueInput.recipientEmail,
          queueInput.subject,
          queueInput.templateKey,
          queueInput.payloadCiphertext,
          queueInput.createdAt,
        );
    }
    return queueInput.id;
  }

  /** Records only a sanitized append-only failure after the decision rollback. */
  private recordTransitionFailure(
    operation: string,
    caseId: string,
    adminId: string,
    documentVersionId: string | undefined,
    error: unknown,
  ): void {
    if (!this.getCaseById(caseId)) return;
    const errorCode =
      error instanceof ValidationError
        ? error.code.toLowerCase()
        : error instanceof ConflictError
          ? "state_conflict"
          : "transition_failed";
    try {
      this.auditService.record({
        eventType: "transition_failed",
        result: "failure",
        actor: { type: "admin", id: adminId },
        caseId,
        documentVersionId,
        metadata: { operation, reason: errorCode },
        errorCode,
        errorMessage: "Contract signature transition failed.",
      });
    } catch (auditError) {
      this.logger.warn("Unable to record contract transition failure", {
        caseId,
        operation,
        error: auditError instanceof Error ? auditError.message : "unknown",
      });
    }
  }

  private getAdminNotificationEmail(): string | null {
    const configured = (
      process.env.CONTRACT_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL
    )?.trim();
    if (configured) return configured;
    const row = this.db
      .prepare(
        `SELECT email
           FROM admins
          WHERE status = 'active' AND TRIM(email) <> ''
          ORDER BY id ASC
          LIMIT 1`,
      )
      .get() as { email: string } | undefined;
    return row?.email.trim() || null;
  }

  private recordSignedUploadFailure(
    token: string,
    authenticatedRiderId: string | undefined,
    resolution: ContractLinkResolution,
    caseId?: string,
    deliveryAttemptId?: string,
    error?: unknown,
  ): void {
    const resolvedCaseId =
      caseId ?? (resolution.kind === "valid" ? resolution.caseId : undefined);
    const resolvedAttemptId =
      deliveryAttemptId ??
      (resolution.kind === "valid" ? resolution.attemptId : undefined);
    const errorCode =
      error instanceof PdfValidationError
        ? error.code
        : error instanceof RepositoryCapacityError
          ? `storage_${error.statusCode}`
          : resolution.kind === "expired"
            ? "link_expired"
            : "signed_upload_failed";
    this.recordPublicAuditBestEffort({
      eventType: "signed_upload_attempt",
      result: "failure",
      actor: authenticatedRiderId
        ? { type: "rider", id: authenticatedRiderId }
        : resolution.kind === "invalid"
          ? { type: "anonymous" }
          : { type: "token" },
      caseId: resolvedCaseId,
      documentVersionId:
        resolution.kind === "valid" ? resolution.documentVersionId : undefined,
      deliveryAttemptId: resolvedAttemptId,
      metadata: { reason: errorCode },
      errorCode,
      errorMessage: "Signed document upload failed.",
    });

    // Keep the raw token limited to the lookup boundary. This no-op reference
    // makes that guarantee explicit without ever including it in audit data.
    void token;
  }

  private recordPublicLinkFailure(
    token: string,
    resolution: Exclude<ContractLinkResolution, { readonly kind: "valid" }>,
    authenticatedRiderId?: string,
  ): void {
    const tokenHash = this.tokenService.hash(token);
    const row = this.db
      .prepare(
        `SELECT attempts.id, attempts.case_id, attempts.document_version_id,
                attempts.expires_at, attempts.revoked_at, cases.rider_id
           FROM contract_delivery_attempts AS attempts
           JOIN contract_signature_cases AS cases ON cases.id = attempts.case_id
          WHERE attempts.token_hash = ?
          LIMIT 1`,
      )
      .get(tokenHash) as
      | {
          id: string;
          case_id: string;
          document_version_id: string;
          expires_at: string;
          revoked_at: string | null;
          rider_id: string;
        }
      | undefined;

    let reason = resolution.kind === "expired" ? "expired" : "unavailable";
    if (row?.revoked_at) reason = "revoked";
    else if (
      authenticatedRiderId &&
      row?.rider_id &&
      authenticatedRiderId !== row.rider_id
    ) {
      reason = "rider_mismatch";
    }

    const metadata: Record<string, unknown> = { reason };
    if (resolution.kind === "expired") {
      metadata.expiresAt = resolution.expiresAt;
    }

    this.recordPublicAuditBestEffort({
      eventType: "link_access",
      result: "failure",
      actor: authenticatedRiderId
        ? { type: "rider", id: authenticatedRiderId }
        : { type: "anonymous" },
      caseId: row?.case_id,
      documentVersionId: row?.document_version_id,
      deliveryAttemptId: row?.id,
      metadata,
      errorCode:
        resolution.kind === "expired" ? "link_expired" : "link_unavailable",
      errorMessage: "This link is unavailable.",
    });
  }

  private recordPublicDownloadAudit(
    access: Extract<PublicLinkAccessResult, { readonly kind: "valid" }>,
    result: "success" | "failure",
    errorCode?: string,
  ): void {
    this.recordPublicAuditBestEffort({
      eventType: "document_download",
      result,
      actor: access.authenticatedRiderId
        ? { type: "rider", id: access.authenticatedRiderId }
        : { type: "token" },
      caseId: access.signatureCase.id,
      documentVersionId: access.documentVersion.id,
      deliveryAttemptId: access.deliveryAttempt.id,
      errorCode,
      errorMessage: errorCode ? "Document is unavailable." : undefined,
    });
  }

  private recordPublicAuditBestEffort(
    input: RecordContractAuditEventInput,
  ): void {
    try {
      this.auditService.record(input);
    } catch (error) {
      this.logger.warn("Unable to record public contract audit event", {
        caseId: input.caseId,
        eventType: input.eventType,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  /**
   * Returns the administrative read model for a case, including the legacy
   * contract state and only the current delivery attempt. The caller must
   * still enforce the admin authorization policy before returning it.
   */
  getAdministrativeCase(caseId: string): AdministrativeSignatureCase | null {
    const row = this.db
      .prepare(
        `SELECT cases.*, contracts.status AS legacy_contract_status
           FROM contract_signature_cases AS cases
           JOIN rental_contracts AS contracts ON contracts.id = cases.contract_id
          WHERE cases.id = ?`,
      )
      .get(caseId) as
      | (ContractSignatureCase & { legacy_contract_status: string })
      | undefined;
    if (!row) return null;

    const originalVersion = row.original_version_id
      ? this.getDocumentVersionById(row.original_version_id)
      : null;
    const currentSignedVersion = row.current_signed_version_id
      ? this.getDocumentVersionById(row.current_signed_version_id)
      : null;
    const currentAttempt = this.db
      .prepare(
        `SELECT id, case_id, document_version_id, attempt_number, token_hash,
                created_at, expires_at, revoked_at, delivery_status, last_error,
                created_by
           FROM contract_delivery_attempts
          WHERE case_id = ? AND revoked_at IS NULL
          ORDER BY attempt_number DESC
          LIMIT 1`,
      )
      .get(caseId) as ContractDeliveryAttempt | undefined;

    return {
      ...row,
      original_version: originalVersion,
      current_signed_version: currentSignedVersion,
      current_delivery_attempt: currentAttempt ?? null,
    };
  }

  /**
   * Enforces the case-level administrative policy. The creator can access the
   * case; an active superadmin can access cases created by another admin.
   */
  assertAdminCaseAccess(
    caseId: string,
    adminId: string,
  ): AdministrativeSignatureCase {
    const signatureCase = this.getAdministrativeCase(caseId);
    if (!signatureCase) throw new NotFoundError("SignatureCase");

    const admin = this.db
      .prepare("SELECT id, status, role FROM admins WHERE id = ?")
      .get(adminId) as { id: string; status: string; role: string } | undefined;
    if (!admin || admin.status !== "active") {
      throw new NotFoundError("Admin");
    }

    const normalizedRole = admin.role.trim().toLowerCase();
    const elevated = ["superadmin", "super_admin", "super-admin"].includes(
      normalizedRole,
    );
    if (signatureCase.created_by !== adminId && !elevated) {
      throw new ForbiddenError("Access denied");
    }
    return signatureCase;
  }

  /** Returns a stable, descending cursor page of delivery attempts. */
  listDeliveryAttempts(
    caseId: string,
    options: ContractSignaturePageOptions = {},
  ): ContractDeliveryAttemptPage {
    const limit = normalizeContractSignaturePageLimit(options.limit);
    const cursor = options.cursor
      ? decodeContractSignatureCursor(options.cursor)
      : null;
    const rows = this.db
      .prepare(
        `SELECT id, case_id, document_version_id, attempt_number, token_hash,
                created_at, expires_at, revoked_at, delivery_status, last_error,
                created_by
           FROM contract_delivery_attempts
          WHERE case_id = ?
            AND (? IS NULL OR created_at < ? OR (created_at = ? AND id < ?))
          ORDER BY created_at DESC, id DESC
          LIMIT ?`,
      )
      .all(
        caseId,
        cursor?.occurredAt ?? null,
        cursor?.occurredAt ?? null,
        cursor?.occurredAt ?? null,
        cursor?.id ?? null,
        limit + 1,
      ) as ContractDeliveryAttempt[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const finalRow = pageRows.at(-1);
    return {
      data: pageRows,
      nextCursor:
        hasMore && finalRow
          ? encodeContractSignatureCursor({
              occurredAt: finalRow.created_at,
              id: finalRow.id,
            })
          : null,
    };
  }

  /** Delegates audit reads to the append-only audit service. */
  listAudit(
    caseId: string,
    options: ContractSignaturePageOptions = {},
  ): ContractAuditPage {
    return this.auditService.listForCase(caseId, options);
  }

  /** Lists only cases visible to the requesting administrator. */
  listReviewQueue(
    adminId: string,
    statuses: readonly ("cargado" | "en_revision")[],
    options: ContractSignaturePageOptions = {},
  ): ReviewQueuePage {
    const admin = this.db
      .prepare("SELECT id, status, role FROM admins WHERE id = ?")
      .get(adminId) as { id: string; status: string; role: string } | undefined;
    if (!admin || admin.status !== "active") throw new NotFoundError("Admin");

    const normalizedRole = admin.role.trim().toLowerCase();
    const elevated = ["superadmin", "super_admin", "super-admin"].includes(
      normalizedRole,
    );
    const statusPlaceholders = statuses.map(() => "?").join(", ");
    const accessClause = elevated ? "1 = 1" : "cases.created_by = ?";
    const limit = normalizeContractSignaturePageLimit(options.limit);
    const cursor = options.cursor
      ? decodeContractSignatureCursor(options.cursor)
      : null;
    const params: unknown[] = [...statuses];
    if (!elevated) params.push(adminId);
    params.push(
      cursor?.occurredAt ?? null,
      cursor?.occurredAt ?? null,
      cursor?.id ?? null,
      limit + 1,
    );
    const rows = this.db
      .prepare(
        `SELECT cases.id, cases.updated_at, contracts.status AS legacy_contract_status,
                signed.id AS current_version_id,
                COALESCE(signed.uploaded_at, cases.updated_at) AS sort_at
           FROM contract_signature_cases AS cases
           JOIN rental_contracts AS contracts ON contracts.id = cases.contract_id
           LEFT JOIN contract_document_versions AS signed
             ON signed.id = cases.current_signed_version_id
          WHERE cases.document_status IN (${statusPlaceholders})
            AND ${accessClause}
            AND (? IS NULL OR COALESCE(signed.uploaded_at, cases.updated_at) < ?
                 OR (COALESCE(signed.uploaded_at, cases.updated_at) = ? AND cases.id < ?))
          ORDER BY sort_at DESC, cases.id DESC
          LIMIT ?`,
      )
      .all(...params) as Array<{
      id: string;
      legacy_contract_status: string;
      current_version_id: string | null;
      sort_at: string;
    }>;
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const finalRow = pageRows.at(-1);
    return {
      data: pageRows.map((row) => ({
        signatureCase: this.getCaseById(row.id) as ContractSignatureCase,
        legacy_contract_status: row.legacy_contract_status,
        documentVersion: row.current_version_id
          ? this.getDocumentVersionById(row.current_version_id)
          : null,
      })),
      nextCursor:
        hasMore && finalRow
          ? encodeContractSignatureCursor({
              occurredAt: finalRow.sort_at,
              id: finalRow.id,
            })
          : null,
    };
  }

  /**
   * Opens an authorized administrative download only after checking the
   * immutable metadata against the storage object. Physical paths and BLOBs
   * never cross this boundary.
   */
  async downloadAdministrativeVersion(
    caseId: string,
    versionId: string,
    adminId: string,
  ): Promise<AdministrativeDocumentDownload> {
    const signatureCase = this.assertAdminCaseAccess(caseId, adminId);
    const documentVersion = this.getDocumentVersionById(versionId);
    if (!documentVersion || documentVersion.case_id !== caseId) {
      throw new NotFoundError("DocumentVersion");
    }
    if (!isDownloadableStorageStatus(documentVersion.storage_status)) {
      throw new ConflictError("Document version is not available for download");
    }

    const downloadableStatus = documentVersion.storage_status;
    let metadata;
    try {
      metadata = await this.storage.stat(documentVersion.storage_key);
    } catch {
      throw new ConflictError(
        "Document version integrity could not be verified",
      );
    }
    if (
      !metadata ||
      metadata.sizeBytes !== documentVersion.size_bytes ||
      metadata.sha256 !== documentVersion.sha256
    ) {
      throw new ConflictError(
        "Document version integrity could not be verified",
      );
    }

    let stream: Readable;
    try {
      stream = await this.storage.openRead(
        documentVersion.storage_key,
        downloadableStatus,
      );
    } catch {
      throw new ConflictError("Document version is not available for download");
    }

    try {
      this.auditService.record({
        eventType: "document_download",
        result: "success",
        actor: { type: "admin", id: adminId },
        caseId,
        documentVersionId: versionId,
        metadata: { surface: "administrative" },
      });
    } catch (auditError) {
      this.logger.warn("Unable to record administrative document download", {
        caseId,
        documentVersionId: versionId,
        error: auditError instanceof Error ? auditError.message : "unknown",
      });
    }

    stream.once("error", () => {
      try {
        this.auditService.record({
          eventType: "document_download",
          result: "failure",
          actor: { type: "admin", id: adminId },
          caseId,
          documentVersionId: versionId,
          metadata: { surface: "administrative" },
          errorCode: "stream_failed",
          errorMessage: "Document is unavailable.",
        });
      } catch {
        // A stream failure must not turn into an internal error response.
      }
    });

    return {
      signatureCase,
      documentVersion,
      stream,
      sizeBytes: metadata.sizeBytes,
    };
  }

  getCaseById(caseId: string): ContractSignatureCase | null {
    const row = this.db
      .prepare("SELECT * FROM contract_signature_cases WHERE id = ?")
      .get(caseId) as ContractSignatureCase | undefined;
    return row ?? null;
  }

  getDocumentVersionById(versionId: string): ContractDocumentVersion | null {
    const row = this.db
      .prepare("SELECT * FROM contract_document_versions WHERE id = ?")
      .get(versionId) as ContractDocumentVersion | undefined;
    return row ?? null;
  }

  getDeliveryAttemptById(attemptId: string): ContractDeliveryAttempt | null {
    const row = this.db
      .prepare(
        `SELECT id, case_id, document_version_id, attempt_number, token_hash,
                created_at, expires_at, revoked_at, delivery_status, last_error,
                created_by
           FROM contract_delivery_attempts
          WHERE id = ?`,
      )
      .get(attemptId) as ContractDeliveryAttempt | undefined;
    return row ?? null;
  }
}

function isDownloadableStorageStatus(
  status: DocumentStorageStatus,
): status is DownloadableStorageStatus {
  return status === "ready" || status === "retained";
}

function normalizeContractSignaturePageLimit(limit?: number): number {
  if (!Number.isInteger(limit)) return 50;
  return Math.min(Math.max(limit as number, 1), 100);
}

function encodeContractSignatureCursor(
  cursor: ContractSignatureCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeContractSignatureCursor(
  encoded: string,
): ContractSignatureCursor {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      typeof (parsed as ContractSignatureCursor).occurredAt !== "string" ||
      typeof (parsed as ContractSignatureCursor).id !== "string" ||
      Number.isNaN(
        new Date((parsed as ContractSignatureCursor).occurredAt).getTime(),
      )
    ) {
      throw new Error();
    }
    return parsed as ContractSignatureCursor;
  } catch {
    throw new ValidationError("Invalid pagination cursor", {
      cursor: ["invalid"],
    });
  }
}

function normalizePublicLinkBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized || /[\s<>]/.test(normalized)) {
    throw new Error("Invalid public contract link base URL");
  }
  return normalized;
}
