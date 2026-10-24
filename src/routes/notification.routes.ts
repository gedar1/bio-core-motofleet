import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { InAppNotificationMolecule } from "../molecules/InAppNotificationMolecule.js";
import {
  parsePushEndpoint,
  parsePushSubscriptionInput,
  type WebPushMolecule,
} from "../molecules/WebPushMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

/** Routes for an authenticated actor's own in-app notification inbox and Push channel. */
export function createNotificationRoutes(
  notificationMolecule: InAppNotificationMolecule,
  webPush: WebPushMolecule,
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get(
    "/push/vapid-public-key",
    (_req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json({ publicKey: webPush.getPublicKey() });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/push/subscriptions",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        webPush.assertEnabled();
        const subscription = parsePushSubscriptionInput(req.body);
        webPush.upsertSubscription(req.user!.id, req.user!.role, subscription);
        res.status(200).json({ active: true });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/push/subscriptions",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        webPush.assertEnabled();
        webPush.deleteSubscription(
          req.user!.id,
          req.user!.role,
          parsePushEndpoint(req.body),
        );
        res.status(200).json({ deleted: true });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/", (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestedLimit = Number(req.query.limit);
      const limit = Number.isFinite(requestedLimit) ? requestedLimit : 20;
      const notifications = notificationMolecule.listForRecipient(
        req.user!.id,
        req.user!.role,
        limit,
      );
      res.status(200).json(notifications);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/unread-count",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const count = notificationMolecule.countUnread(
          req.user!.id,
          req.user!.role,
        );
        res.status(200).json({ count });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/read-all",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = notificationMolecule.markAllRead(
          req.user!.id,
          req.user!.role,
        );
        res.status(200).json({ updated });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:id/read",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const notification = notificationMolecule.markRead(
          req.params.id as string,
          req.user!.id,
          req.user!.role,
        );
        if (!notification) {
          res.status(404).json({
            status: 404,
            code: "NOT_FOUND",
            message: "Notification not found",
          });
          return;
        }
        res.status(200).json(notification);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete("/:id", (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = notificationMolecule.deleteForRecipient(
        req.params.id as string,
        req.user!.id,
        req.user!.role,
      );
      if (!deleted) {
        res.status(404).json({
          status: 404,
          code: "NOT_FOUND",
          message: "Notification not found",
        });
        return;
      }
      res.status(200).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
