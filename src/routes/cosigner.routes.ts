import { Router, Request, Response, NextFunction } from "express";
import type { CosignerMolecule } from "../molecules/CosignerMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createCosignerSchema } from "../atoms/schemas/cosigner.schemas.js";

/**
 * Creates cosigner routes.
 * - GET/POST /api/riders/:riderId/cosigners — admin
 * - PUT /api/cosigners/:id — admin
 */
export function createCosignerRoutes(
  cosignerMolecule: CosignerMolecule,
): Router {
  const router = Router();

  // All cosigner routes require auth + admin
  router.use(authMiddleware, roleGuard("admin"));

  // GET /api/riders/:riderId/cosigners — list cosigners for a rider
  router.get(
    "/:riderId/cosigners",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const cosigners = cosignerMolecule.listByRider(
          req.params.riderId as string,
        );
        res.status(200).json(cosigners);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /api/riders/:riderId/cosigners — create a cosigner for a rider
  router.post(
    "/:riderId/cosigners",
    validate(createCosignerSchema),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const cosigner = cosignerMolecule.create(
          req.params.riderId as string,
          req.body,
        );
        res.status(201).json(cosigner);
      } catch (error) {
        next(error);
      }
    },
  );

  // PUT /api/riders/cosigners/:id — update a cosigner
  router.put(
    "/cosigners/:id",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const cosigner = cosignerMolecule.update(
          req.params.id as string,
          req.body,
        );
        res.status(200).json(cosigner);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
