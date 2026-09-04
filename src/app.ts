import express from "express";
import type { AuthMolecule } from "./molecules/AuthMolecule.js";
import type { UserMolecule } from "./molecules/UserMolecule.js";
import type { RiderMolecule } from "./molecules/RiderMolecule.js";
import type { MotorcycleMolecule } from "./molecules/MotorcycleMolecule.js";
import type { ContractMolecule } from "./molecules/ContractMolecule.js";
import type { CosignerMolecule } from "./molecules/CosignerMolecule.js";
import type { PaymentMolecule } from "./molecules/PaymentMolecule.js";
import type { PricingMolecule } from "./molecules/PricingMolecule.js";
import type { ErrandMolecule } from "./molecules/ErrandMolecule.js";
import type { NotificationMolecule } from "./molecules/NotificationMolecule.js";
import type { InAppNotificationMolecule } from "./molecules/InAppNotificationMolecule.js";
import type { MetricsMolecule } from "./molecules/MetricsMolecule.js";
import type { ContractSignatureMolecule } from "./molecules/ContractSignatureMolecule.js";
import { createAuthRoutes } from "./routes/auth.routes.js";
import { createUserRoutes } from "./routes/user.routes.js";
import { createRiderRoutes } from "./routes/rider.routes.js";
import { createMotorcycleRoutes } from "./routes/motorcycle.routes.js";
import { createContractRoutes } from "./routes/contract.routes.js";
import { createCosignerRoutes } from "./routes/cosigner.routes.js";
import { createPaymentRoutes } from "./routes/payment.routes.js";
import { createPricingRoutes } from "./routes/pricing.routes.js";
import { createErrandRoutes } from "./routes/errand.routes.js";
import { createNotificationRoutes } from "./routes/notification.routes.js";
import { createMetricsRoutes } from "./routes/metrics.routes.js";
import { createContractSignaturePublicRoutes } from "./routes/contract-signature.public.routes.js";
import { createContractSignatureAdminRoutes } from "./routes/contract-signature.admin.routes.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";

/**
 * Container holding all instantiated molecules, passed to createApp.
 */
export interface MoleculeContainer {
  auth: AuthMolecule;
  users: UserMolecule;
  riders: RiderMolecule;
  motorcycles: MotorcycleMolecule;
  contracts: ContractMolecule;
  cosigners: CosignerMolecule;
  payments: PaymentMolecule;
  pricing: PricingMolecule;
  errands: ErrandMolecule;
  notifications: NotificationMolecule;
  inAppNotifications: InAppNotificationMolecule;
  metrics: MetricsMolecule;
  contractSignatures: ContractSignatureMolecule;
}

/**
 * Creates and configures the Express application.
 * Mounts JSON parser, CORS headers, all route modules, and global error handler.
 */
export function createApp(
  molecules: MoleculeContainer,
  db?: import("better-sqlite3").Database,
): express.Application {
  const app = express();

  // --- Body parsing ---
  app.use(express.json());

  // --- CORS ---
  // Browser clients must explicitly originate from an approved frontend URL.
  // Non-browser clients do not send Origin and are unaffected by this policy.
  const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  app.use((req, res, next) => {
    const origin = req.get("Origin");
    if (origin && allowedOrigins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  // --- Public routes ---
  app.use("/api/auth", createAuthRoutes(molecules.auth));
  app.use("/api/users", createUserRoutes(molecules.users));
  app.use("/api/riders", createRiderRoutes(molecules.riders));
  app.use(
    "/public/contract-signatures",
    createContractSignaturePublicRoutes(molecules.contractSignatures),
  );
  // The administrative signature router is mounted at /api because it owns
  // both /contracts/:contractId/signature-case and /contract-signatures/*.
  // Its authorization boundary is path-scoped inside the router so unrelated
  // legacy /api routes continue to reach their own middleware unchanged.
  app.use(
    "/api",
    createContractSignatureAdminRoutes(molecules.contractSignatures),
  );

  // --- Admin routes ---
  app.use("/api/motorcycles", createMotorcycleRoutes(molecules.motorcycles));
  app.use("/api/contracts", createContractRoutes(molecules.contracts));
  app.use("/api/pricing-rules", createPricingRoutes(molecules.pricing));
  app.use("/api/admin", createMetricsRoutes(molecules.metrics, db!));

  // --- Cosigner routes (mounted at specific paths) ---
  app.use("/api/riders", createCosignerRoutes(molecules.cosigners));

  // --- Payment routes (nested under contracts path) ---
  app.use("/api/contracts", createPaymentRoutes(molecules.payments));

  // --- Mixed-role routes ---
  app.use(
    "/api/errands",
    createErrandRoutes(
      molecules.errands,
      molecules.notifications,
      molecules.inAppNotifications,
    ),
  );
  app.use(
    "/api/notifications",
    createNotificationRoutes(molecules.inAppNotifications),
  );

  // --- Global error handler (must be last) ---
  app.use(errorHandler);

  return app;
}
