import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { ContractSignatureMolecule } from "../molecules/ContractSignatureMolecule.js";
import {
  applyPublicLinkSecurityHeaders,
  PublicLinkRateLimiter,
  sendPublicLinkResolutionError,
} from "../infrastructure/TokenService.js";
import { optionalAuthMiddleware } from "../middleware/auth.middleware.js";
import {
  parseSingleMultipartFile,
  MultipartUploadError,
} from "../infrastructure/multipartUpload.js";
import { PdfValidationError } from "../domains/contractSignature.js";
import { ConflictError, ValidationError } from "../domains/errors.js";
import { RepositoryCapacityError } from "../infrastructure/ContractDocumentRepository.js";
import { MAX_CONTRACT_DOCUMENT_BYTES } from "../infrastructure/DocumentStorage.js";

export interface ContractSignaturePublicRoutesOptions {
  /** Injectable for tests and for deployments with shared rate-limit storage. */
  readonly rateLimiter?: PublicLinkRateLimiter;
}

/**
 * Public Rider surface. The link token is the only required credential; a
 * valid optional Rider JWT narrows the link to that Rider when supplied.
 */
export function createContractSignaturePublicRoutes(
  contractSignatureMolecule: ContractSignatureMolecule,
  options: ContractSignaturePublicRoutesOptions = {},
): Router {
  const router = Router();
  const rateLimiter = options.rateLimiter ?? new PublicLinkRateLimiter();

  // Apply these headers before every response from this mounted public
  // surface, including malformed paths and errors handled below.
  router.use((_req: Request, res: Response, next: NextFunction) => {
    applyPublicLinkSecurityHeaders(res);
    next();
  });
  router.use(optionalAuthMiddleware);

  router.post(
    "/:token/signed",
    publicRequestGuard(rateLimiter),
    async (req: Request, res: Response) => {
      try {
        // Parse and bound multipart before handing the file stream to the
        // molecule. No token value is copied to errors, logs or headers.
        const upload = await parseSingleMultipartFile(
          req,
          req.get("Content-Type"),
          MAX_CONTRACT_DOCUMENT_BYTES,
        );
        const result = await contractSignatureMolecule.uploadSignedDocument({
          token: req.params.token as string,
          authenticatedRiderId: req.user?.id,
          fileStream: upload.stream,
          originalFilename: upload.filename,
          declaredMimeType: upload.declaredMimeType,
        });

        if (result.kind !== "valid") {
          sendPublicLinkResolutionError(res, result);
          return;
        }

        // Do not expose case, version, attempt or storage identifiers on the
        // bearer-link surface; the Rider only needs the upload outcome.
        res.status(201).json({
          status: 201,
          uploaded: true,
          document_status: result.signatureCase.document_status,
        });
      } catch (error) {
        sendPublicUploadError(res, error);
      }
    },
  );

  // Keep the more specific path before /:token for readability and to make
  // the public contract explicit.
  router.get(
    "/:token/original",
    publicRequestGuard(rateLimiter),
    async (req: Request, res: Response) => {
      try {
        const result = await contractSignatureMolecule.downloadPublicOriginal(
          req.params.token as string,
          req.user?.id,
        );

        if (result.kind !== "valid") {
          sendPublicLinkResolutionError(res, result);
          return;
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="contract-original.pdf"',
        );
        res.setHeader("Content-Length", String(result.sizeBytes));
        res.setHeader("X-Content-Type-Options", "nosniff");
        result.stream.once("error", () => {
          // The stream error is deliberately not delegated to the global
          // handler: req.path contains the bearer token.
          if (!res.headersSent) {
            sendPublicUnexpectedError(res);
          } else {
            res.destroy();
          }
        });
        result.stream.pipe(res);
      } catch (error) {
        if (!res.headersSent) {
          sendPublicEndpointError(res, error);
        } else {
          res.destroy();
        }
      }
    },
  );

  router.get(
    "/:token",
    publicRequestGuard(rateLimiter),
    (req: Request, res: Response) => {
      try {
        const result = contractSignatureMolecule.getPublicContract(
          req.params.token as string,
          req.user?.id,
        );

        if (result.kind !== "valid") {
          sendPublicLinkResolutionError(res, result);
          return;
        }

        // Deliberately omit case, contract, Rider, version and storage
        // identifiers. The bearer link exposes only the state needed by the
        // Rider to continue the delivery flow.
        res.status(200).json({
          status: 200,
          document_status: result.signatureCase.document_status,
          expires_at: result.deliveryAttempt.expires_at,
          can_download_original: true,
          can_upload_signed: true,
        });
      } catch (error) {
        sendPublicEndpointError(res, error);
      }
    },
  );

  // Query strings are not a second credential channel. Rejecting the whole
  // public query surface also prevents a future endpoint from accidentally
  // treating ?token=... as a bearer token. This catch-all keeps headers and a
  // generic body on unknown paths instead of reaching Express's default 404.
  router.use((_req: Request, res: Response) => {
    sendPublicLinkResolutionError(res, { kind: "invalid" });
  });

  return router;
}

function publicRequestGuard(
  rateLimiter: PublicLinkRateLimiter,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.params.token;
    if (typeof token !== "string" || token.length === 0) {
      sendPublicLinkResolutionError(res, { kind: "invalid" });
      return;
    }

    // A public link carries no query parameters. In particular, a query token
    // is never read, merged with the path token, or reflected in a response.
    if (Object.keys(req.query).length > 0) {
      sendPublicLinkResolutionError(res, { kind: "invalid" });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const decision = rateLimiter.check(token, ip);
    if (!decision.allowed) {
      applyPublicLinkSecurityHeaders(res);
      res.setHeader("Retry-After", String(decision.retryAfterSeconds));
      res.status(429).json({
        status: 429,
        code: "RATE_LIMITED",
        message: "Too many requests.",
      });
      return;
    }

    next();
  };
}

function sendPublicUploadError(response: Response, error: unknown): void {
  sendPublicEndpointError(response, error);
}

function sendPublicEndpointError(response: Response, error: unknown): void {
  if (response.headersSent) return;
  applyPublicLinkSecurityHeaders(response);

  if (error instanceof MultipartUploadError) {
    const tooLarge = error.code === "FILE_TOO_LARGE";
    response.status(tooLarge ? 413 : 400).json({
      status: tooLarge ? 413 : 400,
      code: error.code,
      message: tooLarge
        ? "The uploaded file exceeds the 25 MiB limit"
        : "Invalid multipart upload",
      ...(tooLarge ? {} : { details: { file: [error.code] } }),
    });
    return;
  }

  if (error instanceof PdfValidationError) {
    response.status(400).json({
      status: 400,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  if (error instanceof RepositoryCapacityError) {
    response.status(error.statusCode).json({
      status: error.statusCode,
      code: "DOCUMENT_STORAGE_UNAVAILABLE",
      message: "Contract document storage is unavailable",
    });
    return;
  }

  if (error instanceof ConflictError) {
    response.status(409).json({
      status: 409,
      code: "CONTRACT_DOCUMENT_CONFLICT",
      message: "The signed document could not be accepted",
    });
    return;
  }

  if (error instanceof ValidationError) {
    response.status(400).json({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "The signed document could not be accepted",
    });
    return;
  }

  sendPublicUnexpectedError(response);
}

function sendPublicUnexpectedError(response: Response): void {
  if (response.headersSent) return;
  applyPublicLinkSecurityHeaders(response);
  response.status(500).json({
    status: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
}
