import { Router, Request, Response, NextFunction } from "express";
import type { ErrandMolecule } from "../molecules/ErrandMolecule.js";
import type { NotificationMolecule } from "../molecules/NotificationMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createErrandSchema,
  quoteErrandRequestSchema,
  routeEstimateRequestSchema,
} from "../atoms/schemas.js";
import type { ErrandState } from "../atoms/stateMachines.js";
import type { Role } from "../molecules/IMolecule.js";

/**
 * Creates errand routes with mixed role access.
 * - POST /api/errands/route-estimate — user
 * - POST /api/errands/quote — user
 * - POST /api/errands — user
 * - GET /api/errands/available — rider
 * - GET /api/errands/my — user | rider
 * - GET /api/errands/:id/route-preview — rider Mapbox preview for an existing errand
 * - PATCH /api/errands/:id/accept — rider
 * - PATCH /api/errands/:id/pickup — rider
 * - PATCH /api/errands/:id/deliver — rider
 * - PATCH /api/errands/:id/cancel — user | rider
 */
export function createErrandRoutes(
  errandMolecule: ErrandMolecule,
  notificationMolecule: NotificationMolecule,
): Router {
  const router = Router();

  // All errand routes require authentication
  router.use(authMiddleware);

  // POST /api/errands/route-estimate — user route preview without side effects
  router.post(
    "/route-estimate",
    roleGuard("user"),
    validate(routeEstimateRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const estimate = await errandMolecule.estimateRoute(
          req.body.origin,
          req.body.destination,
        );
        res.status(200).json(estimate);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /api/errands/quote — user gets a short-lived authoritative COP quote
  router.post(
    "/quote",
    roleGuard("user"),
    validate(quoteErrandRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const quote = await errandMolecule.quote(req.user!.id, req.body);
        res.status(201).json(quote);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /api/errands — user creates an errand
  router.post(
    "/",
    roleGuard("user"),
    validate(createErrandSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errand = await errandMolecule.create(req.user!.id, req.body);
        res.status(201).json(errand);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/errands/available — rider sees available errands
  router.get(
    "/available",
    roleGuard("rider"),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const errands = errandMolecule.listAvailable();
        res.status(200).json(errands);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/errands/my — user or rider sees their own errands
  router.get(
    "/my",
    roleGuard("user", "rider"),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const role = req.user!.role;
        const userId = req.user!.id;
        const status = req.query.status as ErrandState | undefined;
        const page = req.query.page
          ? parseInt(req.query.page as string, 10)
          : 1;

        const filters = status ? { status } : undefined;

        let result;
        if (role === "user") {
          result = errandMolecule.listByUser(userId, filters, page);
        } else {
          result = errandMolecule.listByRider(userId, filters, page);
        }

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/errands/:id/route-preview — rider Mapbox preview for an existing errand
  router.get(
    "/:id/route-preview",
    roleGuard("rider"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const route = await errandMolecule.getRoutePreviewForRider(
          req.params.id as string,
          req.user!.id,
        );
        res.status(200).json(route);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/errands/:id/accept — rider accepts an errand
  router.patch(
    "/:id/accept",
    roleGuard("rider"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errand = errandMolecule.accept(
          req.params.id as string,
          req.user!.id,
        );

        // Queue notification asynchronously (don't block response)
        notificationMolecule
          .sendErrandStatusChange(errand.id, "accepted")
          .catch(() => {});

        res.status(200).json(errand);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/errands/:id/pickup — rider marks errand as picked up
  router.patch(
    "/:id/pickup",
    roleGuard("rider"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errand = errandMolecule.markPickedUp(
          req.params.id as string,
          req.user!.id,
        );

        // Queue notification asynchronously
        notificationMolecule
          .sendErrandStatusChange(errand.id, "picked_up")
          .catch(() => {});

        res.status(200).json(errand);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/errands/:id/deliver — rider marks errand as delivered
  router.patch(
    "/:id/deliver",
    roleGuard("rider"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errand = errandMolecule.markDelivered(
          req.params.id as string,
          req.user!.id,
        );

        // Queue notification asynchronously
        notificationMolecule
          .sendErrandStatusChange(errand.id, "delivered")
          .catch(() => {});

        res.status(200).json(errand);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /api/errands/:id/cancel — user or rider cancels an errand
  router.patch(
    "/:id/cancel",
    roleGuard("user", "rider"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { reason } = req.body;
        const role = req.user!.role as Role;

        const errand = errandMolecule.cancel(
          req.params.id as string,
          req.user!.id,
          role,
          reason,
        );

        // Queue notification asynchronously
        notificationMolecule
          .sendErrandStatusChange(errand.id, "cancelled", reason)
          .catch(() => {});

        res.status(200).json(errand);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
