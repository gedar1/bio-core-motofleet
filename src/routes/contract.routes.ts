import { Router, Request, Response, NextFunction } from "express";
import type { ContractMolecule } from "../molecules/ContractMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createContractSchema } from "../atoms/schemas/contract.schemas.js";
import type { ContractState } from "../atoms/stateMachines.js";

/**
 * Creates contract routes. All endpoints require admin role.
 */
export function createContractRoutes(
  contractMolecule: ContractMolecule,
): Router {
  const router = Router();

  // All contract routes require auth + admin
  router.use(authMiddleware, roleGuard("admin"));

  // GET /api/contracts — list with optional filters
  router.get("/", (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as ContractState | undefined;
      const rider_id = req.query.rider_id as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

      const result = contractMolecule.list({ status, rider_id, page });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/contracts — create a new contract
  router.post(
    "/",
    validate(createContractSchema),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const contract = contractMolecule.create(req.body);
        res.status(201).json(contract);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/contracts/:id/cancel — cancel a contract
  router.patch(
    "/:id/cancel",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const contract = contractMolecule.cancel(req.params.id as string);
        res.status(200).json(contract);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/contracts/:id/renew — renew a contract with new end date
  router.patch(
    "/:id/renew",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { end_date } = req.body;
        const contract = contractMolecule.renew(
          req.params.id as string,
          end_date,
        );
        res.status(200).json(contract);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
