import { z } from "zod";
import {
  DOCUMENT_STATUSES,
  FORMALIZATION_STATUSES,
  VERIFICATION_RESULTS,
} from "../../domains/contractSignature.js";

export const uuidSchema = z.string().uuid("Must be a valid UUID");
export const signatureCaseIdSchema = uuidSchema;
export const documentVersionIdSchema = uuidSchema;

/** A base64url token generated from at least 32 random bytes. */
export const signatureLinkTokenSchema = z
  .string()
  .min(43, "token must contain at least 256 bits of entropy")
  .max(512, "token is too long")
  .regex(/^[A-Za-z0-9_-]+$/, "token must be base64url encoded");

export const signatureCaseParamsSchema = z.object({
  caseId: signatureCaseIdSchema,
});

export const contractSignatureCaseParamsSchema = z.object({
  contractId: uuidSchema,
});

export const documentVersionParamsSchema = z.object({
  caseId: signatureCaseIdSchema,
  versionId: documentVersionIdSchema,
});

export const publicSignatureLinkParamsSchema = z.object({
  token: signatureLinkTokenSchema,
});

export const reviewStartSchema = z.object({}).strict();

export const manualVerificationSchema = z.object({
  version_id: documentVersionIdSchema,
  result: z.enum(VERIFICATION_RESULTS),
  comments: z
    .string()
    .trim()
    .max(2000, "comments must be at most 2000 characters")
    .optional(),
});

export const approvalSchema = z.object({
  version_id: documentVersionIdSchema,
});

export const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "reason must be at least 10 characters")
    .max(500, "reason must be at most 500 characters"),
});

const reviewStatusSchema = z.enum(["cargado", "en_revision"]);
const reviewStatusFilterSchema = z.preprocess((value) => {
  if (typeof value === "string") return value.split(",").filter(Boolean);
  return value;
}, z.array(reviewStatusSchema).min(1).max(2));

export const reviewQueueQuerySchema = z.object({
  status: reviewStatusFilterSchema.default(["cargado", "en_revision"]),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
});

export const auditPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
});

export const signatureCaseDetailQuerySchema = z.object({
  document_status: z.enum(DOCUMENT_STATUSES).optional(),
  contractual_status: z.enum(FORMALIZATION_STATUSES).optional(),
});

export type SignatureCaseParams = z.infer<typeof signatureCaseParamsSchema>;
export type ContractSignatureCaseParams = z.infer<
  typeof contractSignatureCaseParamsSchema
>;
export type DocumentVersionParams = z.infer<typeof documentVersionParamsSchema>;
export type PublicSignatureLinkParams = z.infer<
  typeof publicSignatureLinkParamsSchema
>;
export type ManualVerificationInput = z.infer<typeof manualVerificationSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
export type RejectionInput = z.infer<typeof rejectionSchema>;
export type ReviewQueueQuery = z.infer<typeof reviewQueueQuerySchema>;
export type AuditPaginationQuery = z.infer<typeof auditPaginationQuerySchema>;
