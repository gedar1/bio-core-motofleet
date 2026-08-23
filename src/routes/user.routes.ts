import { Router, Request, Response, NextFunction } from "express";
import type { UserMolecule } from "../molecules/UserMolecule.js";
import { validate } from "../middleware/validate.middleware.js";
import { createUserSchema } from "../atoms/schemas/user.schemas.js";

/**
 * Creates user routes. POST /api/users/register is public (no auth middleware).
 */
export function createUserRoutes(userMolecule: UserMolecule): Router {
  const router = Router();

  // POST /api/users/register — public
  router.post(
    "/register",
    validate(createUserSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await userMolecule.register(req.body);

        // Omit password_hash from response
        const { password_hash: _, ...safeUser } = user;

        res.status(201).json(safeUser);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
