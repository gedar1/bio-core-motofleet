import { Router, Request, Response, NextFunction } from "express";
import type { RiderMolecule } from "../molecules/RiderMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createRiderSchema } from "../atoms/schemas.js";

/**
 * Creates rider routes.
 * - POST /api/riders/register — public
 * - PATCH /api/riders/me/availability — rider toggles own availability
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

        // Registration is public for backwards compatibility; never return the
        // sensitive document number in this response.
        const { password_hash: _, document_number: __, ...safeRider } = rider;

        res.status(201).json(safeRider);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/riders/me/availability — rider toggles own availability
  router.patch(
    "/me/availability",
    authMiddleware,
    roleGuard("rider"),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const riderId = req.user!.id;
        const { available } = req.body;
        if (typeof available !== "boolean") {
          res.status(400).json({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Field 'available' must be boolean",
          });
          return;
        }
        riderMolecule.setAvailability(riderId, available);
        res.status(200).json({ id: riderId, available });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
