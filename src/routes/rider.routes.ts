import { Router, Request, Response, NextFunction } from "express";
import type { RiderMolecule } from "../molecules/RiderMolecule.js";
import { validate } from "../middleware/validate.middleware.js";
import { createRiderSchema } from "../atoms/schemas.js";

/**
 * Creates rider routes. POST /api/riders/register is public (no auth middleware).
 */
export function createRiderRoutes(riderMolecule: RiderMolecule): Router {
  const router = Router();

  // POST /api/riders/register — public
  router.post(
    "/register",
    validate(createRiderSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rider = await riderMolecule.register(req.body);

        // Omit password_hash from response
        const { password_hash: _, ...safeRider } = rider;

        res.status(201).json(safeRider);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
