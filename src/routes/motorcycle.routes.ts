import { Router, Request, Response, NextFunction } from "express";
import type { MotorcycleMolecule } from "../molecules/MotorcycleMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createMotorcycleSchema } from "../atoms/schemas/motorcycle.schemas.js";
import type { MotorcycleState } from "../atoms/stateMachines.js";

/**
 * Creates motorcycle routes. All endpoints require admin role.
 */
export function createMotorcycleRoutes(
  motorcycleMolecule: MotorcycleMolecule,
): Router {
  const router = Router();

  // All motorcycle routes require auth + admin
  router.use(authMiddleware, roleGuard("admin"));

  // GET /api/motorcycles — list with optional status filter and pagination
  router.get("/", (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as MotorcycleState | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

      const result = motorcycleMolecule.list(
        status ? { status } : undefined,
        page,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/motorcycles — register a new motorcycle
  router.post(
    "/",
    validate(createMotorcycleSchema),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const motorcycle = motorcycleMolecule.create(req.body);
        res.status(201).json(motorcycle);
      } catch (error) {
        next(error);
      }
    },
  );

  // PUT /api/motorcycles/:id — update motorcycle fields
  router.put("/:id", (req: Request, res: Response, next: NextFunction) => {
    try {
      const motorcycle = motorcycleMolecule.update(
        req.params.id as string,
        req.body,
      );
      res.status(200).json(motorcycle);
    } catch (error) {
      next(error);
    }
  });

  // PATCH /api/motorcycles/:id/status — change motorcycle state
  router.patch(
    "/:id/status",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { status } = req.body;
        const motorcycle = motorcycleMolecule.changeStatus(
          req.params.id as string,
          status,
        );
        res.status(200).json(motorcycle);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
