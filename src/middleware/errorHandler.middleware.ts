import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { createLogger } from "../infrastructure/logger.js";

const logger = createLogger("errorHandler");

/**
 * Application-specific error class with structured fields.
 * Throw this from routes/molecules to return a well-formed error response.
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

/**
 * Transforms a ZodError into a Record<string, string[]> mapping field paths to error messages.
 */
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

/**
 * Global Express error handler middleware.
 * Handles AppError, ZodError, and generic errors with structured responses.
 * Never exposes stack traces to the client.
 * Logs with error level for 5xx, warn for 4xx.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle AppError
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
