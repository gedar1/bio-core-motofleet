import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { createLogger } from "../infrastructure/logger.js";
import {
  BusinessRuleViolation,
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidStateTransition,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../domains/errors.js";

const logger = createLogger("errorHandler");

// ─── Legacy AppError (routes may still throw this directly) ─────────────────

/**
 * Application-specific error class with structured fields.
 * Retained for backward compatibility in route handlers that have not yet
 * migrated to domain errors. New code should throw domain errors instead.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ─── Domain error → HTTP status mapping ─────────────────────────────────────

function domainErrorToStatus(err: DomainError): number {
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ValidationError) return 400;
  if (err instanceof BusinessRuleViolation) return 400;
  if (err instanceof InvalidStateTransition) return 400;
  if (err instanceof ConflictError) return 409;
  if (err instanceof ForbiddenError) return 403;
  if (err instanceof UnauthorizedError) return 401;
  return 500;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatZodError(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return details;
}

// ─── Express error handler ──────────────────────────────────────────────────

/**
 * Global Express error handler middleware.
 * Handles DomainError, legacy AppError, ZodError, and generic errors with
 * structured responses. Never exposes stack traces to the client.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle domain errors (thrown by molecules)
  if (err instanceof DomainError) {
    const status = domainErrorToStatus(err);

    if (status >= 500) {
      logger.error(err.message, {
        status,
        code: err.code,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn(err.message, {
        status,
        code: err.code,
        path: req.path,
        method: req.method,
      });
    }

    const response: Record<string, unknown> = {
      status,
      code: err.code,
      message: err.message,
    };

    if (err instanceof ValidationError && err.details) {
      response.details = err.details;
    }

    res.status(status).json(response);
    return;
  }

  // Handle legacy AppError (routes that have not migrated yet)
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, {
        status: err.status,
        code: err.code,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn(err.message, {
        status: err.status,
        code: err.code,
        path: req.path,
        method: req.method,
      });
    }

    const response: Record<string, unknown> = {
      status: err.status,
      code: err.code,
      message: err.message,
    };

    if (err.details) {
      response.details = err.details;
    }

    res.status(err.status).json(response);
    return;
  }

  // Handle ZodError
  if (err instanceof ZodError) {
    logger.warn("Validation error", {
      path: req.path,
      method: req.method,
    });

    res.status(400).json({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid input data",
      details: formatZodError(err),
    });
    return;
  }

  // Handle generic/unknown errors — never expose internals
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err.message,
  });

  res.status(500).json({
    status: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
}
