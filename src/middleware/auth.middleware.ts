import type { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import type { JwtPayload, Role } from "../molecules/IMolecule.js";
import { createLogger } from "../infrastructure/logger.js";

const jwt = jsonwebtoken as unknown as typeof jsonwebtoken;

const logger = createLogger("auth.middleware");

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-me";

/**
 * Extend Express Request to include user payload from JWT.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Extracts and verifies JWT from Authorization: Bearer <token> header.
 * Injects req.user = { id, role, email } into request.
 * Returns 401 if token is missing, invalid, or expired.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Missing or malformed Authorization header", {
      path: req.path,
    });
    res.status(401).json({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jsonwebtoken.JwtPayload;

    req.user = {
      id: decoded.id as string,
      role: decoded.role as Role,
      email: decoded.email as string,
    };

    next();
  } catch (error) {
    logger.warn("JWT verification failed", {
      path: req.path,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(401).json({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
}

/**
 * Reads a JWT when one is supplied, without making authentication mandatory.
 * Public contract links remain bearer-authorized by themselves; a valid Rider
 * JWT only narrows access to the Rider bound to the link.
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      authHeader.slice(7),
      JWT_SECRET,
    ) as jsonwebtoken.JwtPayload;

    if (
      typeof decoded.id === "string" &&
      typeof decoded.role === "string" &&
      typeof decoded.email === "string"
    ) {
      req.user = {
        id: decoded.id,
        role: decoded.role as Role,
        email: decoded.email,
      };
    }
  } catch {
    // The link is the public credential. An invalid optional JWT is treated as
    // absent so it cannot make a valid link enumerable through JWT errors.
  }

  next();
}
