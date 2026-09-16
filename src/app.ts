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
}

/**
 * Tracks the number of HTTP requests currently being processed.
 * Incremented when a request arrives, decremented when the response finishes.
 * Used during graceful shutdown to delay database closure until all async
 * handlers (e.g. the Mapbox await in ErrandMolecule.quote) have completed.
 */
let inFlightRequests = 0;
const drainListeners: Array<() => void> = [];

function onRequestFinished(): void {
  inFlightRequests = Math.max(0, inFlightRequests - 1);
  if (inFlightRequests === 0 && drainListeners.length > 0) {
    const listeners = drainListeners.splice(0);
    for (const fn of listeners) fn();
  }
}

/**
 * Returns a Promise that resolves when all in-flight requests have finished.
 * Resolves immediately if there are no active requests.
 */
export function waitForDrain(): Promise<void> {
  if (inFlightRequests === 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    drainListeners.push(resolve);
  });
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

  // --- In-flight request counter ---
  // Must be the first middleware so every request is tracked, including those
  // that await external services (e.g. Mapbox) before touching the database.
  // A single flag per response prevents double-decrement: both "finish" and
  // "close" can fire on the same response (e.g. normal HTTP/1.1 completion),
  // so we guard with `decremented` to ensure onRequestFinished runs only once.
  app.use((_req, res, next) => {
    inFlightRequests += 1;
    let decremented = false;
    const decrement = () => {
      if (!decremented) {
        decremented = true;
        onRequestFinished();
      }
    };
    res.on("finish", decrement);
    res.on("close", decrement);
    next();
  });

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

  // --- Health check (used by Railway to confirm the container is ready) ---
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // --- Public routes ---
  app.use("/api/auth", createAuthRoutes(molecules.auth));
  app.use("/api/users", createUserRoutes(molecules.users));
  app.use("/api/riders", createRiderRoutes(molecules.riders));

  // --- Admin routes ---
  app.use("/api/motorcycles", createMotorcycleRoutes(molecules.motorcycles));
  app.use("/api/contracts", createContractRoutes(molecules.contracts));
  app.use("/api/pricing-rules", createPricingRoutes(molecules.pricing));
  app.use(
    "/api/admin",
    createMetricsRoutes(molecules.metrics, db!, molecules.riders),
  );

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
