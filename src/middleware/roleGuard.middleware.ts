import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Role } from "../molecules/IMolecule.js";

/**
 * Factory function that creates role-based access control middleware.
 * Returns 403 if req.user.role is not in the allowed roles list.
 *
 * Usage: router.get("/admin", authMiddleware, roleGuard("admin"), handler)
 */
export function roleGuard(...allowedRoles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    console.log(
      "[roleGuard] user:",
      JSON.stringify(req.user),
      "allowed:",
      allowedRoles,
      "userRole:",
      userRole,
    );

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        status: 403,
        code: "FORBIDDEN",
        message: "Access denied",
      });
      return;
    }

    next();
  };
}
