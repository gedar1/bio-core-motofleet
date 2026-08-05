import { Router, Request, Response, NextFunction } from "express";
import type { AuthMolecule } from "../molecules/AuthMolecule.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginSchema } from "../atoms/schemas.js";

/**
 * Creates auth routes. POST /api/auth/login is public (no auth middleware).
 */
export function createAuthRoutes(authMolecule: AuthMolecule): Router {
  const router = Router();

  // POST /api/auth/login — public
  router.post(
    "/login",
    validate(loginSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password } = req.body;

        const result = await authMolecule.login(email, password);

        if (!result) {
          res.status(401).json({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Credenciales inválidas",
          });
          return;
        }

        res.status(200).json({
          token: result.token,
          role: result.role,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
