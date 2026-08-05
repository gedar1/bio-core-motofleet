import type { Request, Response, NextFunction, RequestHandler } from "express";
import { type ZodSchema, ZodError } from "zod";

/**
 * Factory function that creates Zod validation middleware.
 * Validates the specified source (body, query, or params) against the schema.
 * Transforms ZodError into structured VALIDATION_ERROR response.
 *
 * Usage: router.post("/users", validate(createUserSchema), handler)
 */
export function validate(
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body",
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];

    const result = schema.safeParse(data);

    if (!result.success) {
      const details = formatZodError(result.error);
      res.status(400).json({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details,
      });
      return;
    }

    // Replace the source data with the parsed (and potentially transformed) value
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
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
