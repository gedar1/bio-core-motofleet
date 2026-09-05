import { Router, Request, Response, NextFunction } from "express";
import type { PricingMolecule } from "../molecules/PricingMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
} from "../atoms/schemas/pricing.schemas.js";

/**
 * Creates pricing rule routes. All endpoints require admin role.
 */
export function createPricingRoutes(pricingMolecule: PricingMolecule): Router {
  const router = Router();

  // All pricing routes require auth + admin
  router.use(authMiddleware, roleGuard("admin"));

  // GET /api/pricing-rules — list all pricing rules
  router.get("/", (req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = pricingMolecule.list();
      res.status(200).json(rules);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/pricing-rules — create a new pricing rule
  router.post(
    "/",
    validate(createPricingRuleSchema),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const rule = pricingMolecule.create(req.body);
        res.status(201).json(rule);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/pricing-rules/:id — pricing rule details for editing
  router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = pricingMolecule
        .list()
        .find((item) => item.id === (req.params.id as string));
      if (!rule) {
        res.status(404).json({
          status: 404,
          code: "NOT_FOUND",
          message: "Pricing rule not found",
        });
        return;
      }
      res.status(200).json(rule);
    } catch (error) {
      next(error);
    }
  });

  // PATCH /api/pricing-rules/:id — update pricing values
  router.patch(
    "/:id",
    validate(updatePricingRuleSchema),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const rule = pricingMolecule.update(req.params.id as string, req.body);
        res.status(200).json(rule);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/pricing-rules/:id/deactivate — deactivate a pricing rule
  router.patch(
    "/:id/deactivate",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const rule = pricingMolecule.deactivate(req.params.id as string);
        res.status(200).json(rule);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
