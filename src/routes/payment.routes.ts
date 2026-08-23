import { Router, Request, Response, NextFunction } from "express";
import type { PaymentMolecule } from "../molecules/PaymentMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createPaymentSchema } from "../atoms/schemas/payment.schemas.js";

/**
 * Creates payment routes. All endpoints require admin role.
 */
export function createPaymentRoutes(paymentMolecule: PaymentMolecule): Router {
  const router = Router();

  // All payment routes require auth + admin
  router.use(authMiddleware, roleGuard("admin"));

  // GET /api/contracts/:contractId/payments — list payments for a contract
  router.get(
    "/:contractId/payments",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const payments = paymentMolecule.listByContract(
          req.params.contractId as string,
        );
        res.status(200).json(payments);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /api/contracts/:contractId/payments — register a payment
  router.post(
    "/:contractId/payments",
    validate(createPaymentSchema),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const payment = paymentMolecule.create(
          req.params.contractId as string,
          req.body,
        );
        res.status(201).json(payment);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
