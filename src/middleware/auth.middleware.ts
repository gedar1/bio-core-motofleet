import type { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import type { JwtPayload } from "../molecules/IMolecule.js";
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

  if (!authHeader?.startsWith("Bearer ")) {
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
    const role = decoded.role;
    if (
      typeof decoded.id !== "string" ||
      decoded.id.trim().length === 0 ||
      typeof decoded.email !== "string" ||
      decoded.email.trim().length === 0 ||
      (role !== "user" && role !== "rider" && role !== "admin")
    ) {
      throw new Error("Invalid JWT claims");
    }

    req.user = {
      id: decoded.id,
      role,
      email: decoded.email,
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
