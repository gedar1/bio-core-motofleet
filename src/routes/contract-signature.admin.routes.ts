import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type {
  AdministrativeSignatureCase,
  ContractDeliveryAttempt,
  ContractDocumentVersion,
  ContractSignatureMolecule,
  ReviewQueueItem,
} from "../molecules/ContractSignatureMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  auditPaginationQuerySchema,
  approvalSchema,
  contractSignatureCaseParamsSchema,
  documentVersionParamsSchema,
  manualVerificationSchema,
  rejectionSchema,
  reviewQueueQuerySchema,
  reviewStartSchema,
  signatureCaseDetailQuerySchema,
  signatureCaseParamsSchema,
} from "../atoms/schemas/contractSignature.schemas.js";
import { MAX_CONTRACT_DOCUMENT_BYTES } from "../infrastructure/DocumentStorage.js";
import {
  MultipartUploadError,
  parseSingleMultipartFile,
  type MultipartFileUpload,
} from "../infrastructure/multipartUpload.js";

interface AdministrativeRequest extends Request {
  contractUpload?: MultipartFileUpload;
}

const emptyBodySchema = reviewStartSchema;

/**
 * Administrative surface for the contract-signature flow. The router is
 * mounted at /api and owns its complete authorization boundary.
 */
export function createContractSignatureAdminRoutes(
  contractSignatureMolecule: ContractSignatureMolecule,
): Router {
  const router = Router();

  // Keep the auth boundary scoped to this router's actual public paths. The
  // router is mounted at /api alongside legacy routers; a router-wide guard
  // would otherwise intercept unrelated legacy endpoints before they can run.
  router.use(
    "/contracts/:contractId/signature-case",
    authMiddleware,
    roleGuard("admin"),
  );
  router.use("/contract-signatures", authMiddleware, roleGuard("admin"));

  router.post(
    "/contracts/:contractId/signature-case",
    validate(contractSignatureCaseParamsSchema, "params"),
    validate(emptyBodySchema),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const signatureCase = contractSignatureMolecule.createCase({
          contractId: req.params.contractId as string,
          adminId: req.user!.id,
        });
        const administrativeCase =
          contractSignatureMolecule.getAdministrativeCase(signatureCase.id);
        res.status(201).json({
          status: 201,
          ...serializeCase(administrativeCase, signatureCase),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/contract-signatures/review",
    validate(reviewQueueQuerySchema, "query"),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const query = req.query as unknown as {
          status: ["cargado" | "en_revision", ...("cargado" | "en_revision")[]];
          limit: number;
          cursor?: string;
        };
        const page = contractSignatureMolecule.listReviewQueue(
          req.user!.id,
          query.status,
          { limit: query.limit, cursor: query.cursor },
        );
        res.status(200).json({
          status: 200,
          data: page.data.map(serializeReviewQueueItem),
          next_cursor: page.nextCursor,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/contract-signatures/:caseId",
    validate(signatureCaseParamsSchema, "params"),
    validate(signatureCaseDetailQuerySchema, "query"),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response) => {
      const administrativeCase = res.locals
        .contractSignatureCase as AdministrativeSignatureCase;
      res.status(200).json({
        status: 200,
        ...serializeCase(administrativeCase),
      });
    },
  );

  router.post(
    "/contract-signatures/:caseId/original",
    validate(signatureCaseParamsSchema, "params"),
    withCaseAuthorization(contractSignatureMolecule),
    parseAdministrativeMultipart(),
    async (req: AdministrativeRequest, res: Response, next: NextFunction) => {
      try {
        const upload = req.contractUpload;
        if (!upload) {
          throw new MultipartUploadError(
            "MULTIPART_REQUIRED",
            "A multipart file upload is required",
          );
        }
        const result = await contractSignatureMolecule.uploadOriginalDocument({
          caseId: req.params.caseId as string,
          adminId: req.user!.id,
          fileStream: upload.stream,
          originalFilename: upload.filename,
          declaredMimeType: upload.declaredMimeType,
        });
        const administrativeCase =
          contractSignatureMolecule.getAdministrativeCase(
            result.signatureCase.id,
          );
        res.status(201).json({
          status: 201,
          ...serializeCase(administrativeCase, result.signatureCase),
          document_version: serializeVersion(result.documentVersion),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/contract-signatures/:caseId/send",
    validate(signatureCaseParamsSchema, "params"),
    validate(emptyBodySchema),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = contractSignatureMolecule.send({
          caseId: req.params.caseId as string,
          adminId: req.user!.id,
        });
        res.status(201).json({
          status: 201,
          ...serializeCase(
            contractSignatureMolecule.getAdministrativeCase(
              result.signatureCase.id,
            ),
            result.signatureCase,
          ),
          delivery_attempt: serializeAttempt(result.deliveryAttempt),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/contract-signatures/:caseId/resend",
    validate(signatureCaseParamsSchema, "params"),
    validate(emptyBodySchema),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = contractSignatureMolecule.resend({
          caseId: req.params.caseId as string,
          adminId: req.user!.id,
        });
        res.status(201).json({
          status: 201,
          ...serializeCase(
            contractSignatureMolecule.getAdministrativeCase(
              result.signatureCase.id,
            ),
            result.signatureCase,
          ),
          delivery_attempt: serializeAttempt(result.deliveryAttempt),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/contract-signatures/:caseId/attempts",
    validate(signatureCaseParamsSchema, "params"),
    validate(auditPaginationQuerySchema, "query"),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const query = req.query as unknown as {
          limit: number;
          cursor?: string;
        };
        const page = contractSignatureMolecule.listDeliveryAttempts(
          req.params.caseId as string,
          query,
        );
        res.status(200).json({
          status: 200,
          data: page.data.map(serializeAttempt),
          next_cursor: page.nextCursor,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/contract-signatures/:caseId/audit",
    validate(signatureCaseParamsSchema, "params"),
    validate(auditPaginationQuerySchema, "query"),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const query = req.query as unknown as {
          limit: number;
          cursor?: string;
        };
        const page = contractSignatureMolecule.listAudit(
          req.params.caseId as string,
          query,
        );
        res.status(200).json({
          status: 200,
          data: page.data,
          next_cursor: page.nextCursor,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/contract-signatures/:caseId/review/start",
    validate(signatureCaseParamsSchema, "params"),
    validate(emptyBodySchema),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = contractSignatureMolecule.startReview({
          caseId: req.params.caseId as string,
          adminId: req.user!.id,
        });
        res.status(200).json({
          status: 200,
          ...serializeCase(
            contractSignatureMolecule.getAdministrativeCase(
              result.signatureCase.id,
            ),
            result.signatureCase,
          ),
          document_version: serializeVersion(result.documentVersion),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/contract-signatures/:caseId/verify",
    validate(signatureCaseParamsSchema, "params"),
    validate(manualVerificationSchema),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = contractSignatureMolecule.verify({
          caseId: req.params.caseId as string,
          adminId: req.user!.id,
          version_id: req.body.version_id,
          result: req.body.result,
          comments: req.body.comments,
        });
        res.status(200).json({
          status: 200,
          ...serializeCase(
            contractSignatureMolecule.getAdministrativeCase(
              result.signatureCase.id,
            ),
            result.signatureCase,
          ),
          document_version: serializeVersion(result.documentVersion),
          verification: result.verification,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/contract-signatures/:caseId/approve",
    validate(signatureCaseParamsSchema, "params"),
    validate(approvalSchema),
    withCaseAuthorization(contractSignatureMolecule),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await contractSignatureMolecule.approve({
          caseId: req.params.caseId as string,
          adminId: req.user!.id,
          version_id: req.body.version_id,
        });
        res.status(200).json({
          status: 200,
          ...serializeCase(
            contractSignatureMolecule.getAdministrativeCase(
              result.signatureCase.id,
            ),
            result.signatureCase,
          ),
          document_version: serializeVersion(result.documentVersion),
          formalized_at: result.formalizedAt,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/contract-signatures/:caseId/reject",
    validate(signatureCaseParamsSchema, "params"),
    validate(rejectionSchema),
    withCaseAuthorization(contractSignatureMolecule),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = contractSignatureMolecule.reject({
          caseId: req.params.caseId as string,
          adminId: req.user!.id,
          reason: req.body.reason,
        });
        res.status(200).json({
          status: 200,
          ...serializeCase(
            contractSignatureMolecule.getAdministrativeCase(
              result.signatureCase.id,
            ),
            result.signatureCase,
          ),
          document_version: serializeVersion(result.documentVersion),
          reason: result.reason,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/contract-signatures/:caseId/versions/:versionId/download",
    validate(documentVersionParamsSchema, "params"),
    withCaseAuthorization(contractSignatureMolecule),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result =
          await contractSignatureMolecule.downloadAdministrativeVersion(
            req.params.caseId as string,
            req.params.versionId as string,
            req.user!.id,
          );
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="contract-document.pdf"',
        );
        res.setHeader("Content-Length", String(result.sizeBytes));
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("X-Content-Type-Options", "nosniff");
        result.stream.once("error", () => {
          if (!res.headersSent) res.status(409).end();
          else res.destroy();
        });
        result.stream.pipe(res);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

function withCaseAuthorization(
  molecule: ContractSignatureMolecule,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const caseId = req.params.caseId as string;
      const administrativeCase = molecule.getAdministrativeCase(caseId);
      if (administrativeCase) {
        res.locals.contractSignatureCase = administrativeCase;
        res.locals.contractSignatureStatus = {
          contractual_status: administrativeCase.formalization_status,
          legacy_contract_status: administrativeCase.legacy_contract_status,
        };
      }
      molecule.assertAdminCaseAccess(caseId, req.user!.id);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function parseAdministrativeMultipart(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    parseSingleMultipartFile(
      req,
      req.get("Content-Type"),
      MAX_CONTRACT_DOCUMENT_BYTES,
    )
      .then((upload) => {
        (req as AdministrativeRequest).contractUpload = upload;
        next();
      })
      .catch(next);
  };
}

function serializeCase(
  administrativeCase: AdministrativeSignatureCase | null,
  fallback?: {
    id: string;
    document_status: string;
    formalization_status: string;
    contract_id: string;
    rider_id: string;
    motorcycle_id: string;
    original_version_id: string | null;
    current_signed_version_id: string | null;
    reviewed_version_id: string | null;
    delivery_attention: string | null;
    formalized_at: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  },
): Record<string, unknown> {
  const source = administrativeCase ?? fallback;
  if (!source) return {};
  const legacyStatus = administrativeCase?.legacy_contract_status ?? null;
  const contractualStatus = source.formalization_status;
  const payload: Record<string, unknown> = {
    case_id: source.id,
    contract_id: source.contract_id,
    rider_id: source.rider_id,
    motorcycle_id: source.motorcycle_id,
    document_status: source.document_status,
    formalization_status: contractualStatus,
    contractual_status: contractualStatus,
    legacy_contract_status: legacyStatus,
    delivery_attention: source.delivery_attention,
    original_version_id: source.original_version_id,
    current_signed_version_id: source.current_signed_version_id,
    reviewed_version_id: source.reviewed_version_id,
    formalized_at: source.formalized_at,
    created_by: source.created_by,
    created_at: source.created_at,
    updated_at: source.updated_at,
    original_version: administrativeCase
      ? serializeVersion(administrativeCase.original_version)
      : null,
    current_signed_version: administrativeCase
      ? serializeVersion(administrativeCase.current_signed_version)
      : null,
    current_delivery_attempt: administrativeCase
      ? serializeAttempt(administrativeCase.current_delivery_attempt)
      : null,
  };
  return {
    ...payload,
    signature_case: { ...payload },
    contractual_status: contractualStatus,
    legacy_contract_status: legacyStatus,
  };
}

function serializeVersion(
  version: ContractDocumentVersion | null | undefined,
): Record<string, unknown> | null {
  if (!version) return null;
  return { ...version };
}

function serializeAttempt(
  attempt: ContractDeliveryAttempt | null | undefined,
): Record<string, unknown> | null {
  if (!attempt) return null;
  const {
    token_hash: _tokenHash,
    last_error: lastError,
    ...safeAttempt
  } = attempt;
  return {
    ...safeAttempt,
    last_error: lastError ? "Delivery failed" : null,
  };
}

function serializeReviewQueueItem(
  item: ReviewQueueItem,
): Record<string, unknown> {
  const administrativeCase = {
    ...item.signatureCase,
    legacy_contract_status: item.legacy_contract_status,
    original_version: null,
    current_signed_version: item.documentVersion,
    current_delivery_attempt: null,
  } as AdministrativeSignatureCase;
  return {
    ...serializeCase(administrativeCase),
    document_version: serializeVersion(item.documentVersion),
  };
}
