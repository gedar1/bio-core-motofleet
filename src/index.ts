import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, waitForDrainUntil, type MoleculeContainer } from "./app.js";
import { createDatabase, runMigrations } from "./infrastructure/database.js";
import { createLogger } from "./infrastructure/logger.js";
import { Scheduler } from "./infrastructure/scheduler.js";
import { AuthMolecule } from "./molecules/AuthMolecule.js";
import { UserMolecule } from "./molecules/UserMolecule.js";
import { RiderMolecule } from "./molecules/RiderMolecule.js";
import { MotorcycleMolecule } from "./molecules/MotorcycleMolecule.js";
import { ContractMolecule } from "./molecules/ContractMolecule.js";
import { CosignerMolecule } from "./molecules/CosignerMolecule.js";
import { PaymentMolecule } from "./molecules/PaymentMolecule.js";
import { PricingMolecule } from "./molecules/PricingMolecule.js";
import { ErrandMolecule } from "./molecules/ErrandMolecule.js";
import { NotificationMolecule } from "./molecules/NotificationMolecule.js";
import { InAppNotificationMolecule } from "./molecules/InAppNotificationMolecule.js";
import { WebPushMolecule } from "./molecules/WebPushMolecule.js";
import { MetricsMolecule } from "./molecules/MetricsMolecule.js";
import { MapboxRoutingProvider } from "./infrastructure/routing/MapboxRoutingProvider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger("server");

async function main(): Promise<void> {
  // --- Load environment ---
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const dbPath = process.env.DB_PATH || path.resolve("data/motofleet.db");
  const migrationsDir = path.resolve(__dirname, "migrations");

  // --- Initialize database ---
  logger.info("Initializing database", { dbPath });
  const db = createDatabase(dbPath);
  runMigrations(db, migrationsDir);

  // --- Instantiate molecules ---
  const authMolecule = new AuthMolecule(db, createLogger("AuthMolecule"));
  const userMolecule = new UserMolecule(db, createLogger("UserMolecule"));
  const riderMolecule = new RiderMolecule(db, createLogger("RiderMolecule"));
  const motorcycleMolecule = new MotorcycleMolecule(
    db,
    createLogger("MotorcycleMolecule"),
  );
  const contractMolecule = new ContractMolecule(
    db,
    createLogger("ContractMolecule"),
  );
  const cosignerMolecule = new CosignerMolecule(
    db,
    createLogger("CosignerMolecule"),
  );
  const paymentMolecule = new PaymentMolecule(
    db,
    createLogger("PaymentMolecule"),
  );
  const pricingMolecule = new PricingMolecule(
    db,
    createLogger("PricingMolecule"),
  );
  if (!process.env.MAPBOX_SECRET_TOKEN?.trim()) {
    throw new Error(
      "MAPBOX_SECRET_TOKEN must be configured for Mapbox routing",
    );
  }

  const routingProvider = new MapboxRoutingProvider();
  const allowHaversineFallback =
    process.env.ROUTING_ALLOW_HAVERSINE_FALLBACK === "true";

  logger.info("Routing provider configured", {
    provider: "mapbox",
    allowHaversineFallback,
  });

  const errandMolecule = new ErrandMolecule(
    db,
    createLogger("ErrandMolecule"),
    routingProvider,
    allowHaversineFallback,
  );
  const notificationMolecule = new NotificationMolecule(
    db,
    createLogger("NotificationMolecule"),
  );
  const webPushMolecule = new WebPushMolecule(
    db,
    createLogger("WebPushMolecule"),
  );
  const inAppNotificationMolecule = new InAppNotificationMolecule(
    db,
    createLogger("InAppNotificationMolecule"),
    webPushMolecule,
  );
  const metricsMolecule = new MetricsMolecule(
    db,
    createLogger("MetricsMolecule"),
  );

  const molecules: MoleculeContainer = {
    auth: authMolecule,
    users: userMolecule,
    riders: riderMolecule,
    motorcycles: motorcycleMolecule,
    contracts: contractMolecule,
    cosigners: cosignerMolecule,
    payments: paymentMolecule,
    pricing: pricingMolecule,
    errands: errandMolecule,
    notifications: notificationMolecule,
    inAppNotifications: inAppNotificationMolecule,
    webPush: webPushMolecule,
    metrics: metricsMolecule,
  };

  // --- Create Express app ---
  const app = createApp(molecules, db);

  // --- Register scheduler tasks ---
  const scheduler = new Scheduler(createLogger("Scheduler"));

  // Expire overdue contracts every hour
  scheduler.register(
    "expire-contracts",
    "Expire overdue rental contracts",
    60 * 60 * 1000,
    async () => {
      const count = contractMolecule.expireOverdue();
      if (count > 0) {
        logger.info("Expired overdue contracts", { count });
      }
    },
    true,
  );

  const emailNotificationsEnabled =
    process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";

  if (emailNotificationsEnabled) {
    // Process notification queue every 30 seconds.
    scheduler.register(
      "process-notifications",
      "Process email notification queue",
      30 * 1000,
      async () => {
        const sent = await notificationMolecule.processQueue();
        if (sent > 0) {
          logger.info("Processed notifications", { sent });
        }
      },
      true,
    );
  } else {
    logger.info(
      "Email notifications disabled; notification queue processor not registered",
    );
  }

  // --- Start Express server ---
  const server = app.listen(port, () => {
    logger.info(`MotoFleet MVP server running on port ${port}`);
  });

  // --- Graceful shutdown ---
  let shuttingDown = false;
  let forceExitTimer: ReturnType<typeof setTimeout> | undefined;

  const clearForceExitTimer = (): void => {
    if (forceExitTimer) {
      clearTimeout(forceExitTimer);
      forceExitTimer = undefined;
    }
  };

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      logger.info("Shutdown already in progress; ignoring signal", { signal });
      return;
    }

    shuttingDown = true;
    logger.info("Shutdown initiated by signal", { signal });
    forceExitTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);

    scheduler.shutdown();
    const deadline = Date.now() + 8_000;

    try {
      const serverClosed = new Promise<void>((resolve) => {
        server.close(() => {
          logger.info("HTTP server closed");
          resolve();
        });
      });

      const serverClosedBeforeDeadline = Promise.race([
        serverClosed,
        new Promise<void>((resolve) =>
          setTimeout(
            () => {
              logger.warn("HTTP server close deadline reached");
              resolve();
            },
            Math.max(0, deadline - Date.now()),
          ),
        ),
      ]);

      await Promise.all([
        serverClosedBeforeDeadline,
        waitForDrainUntil(deadline),
        webPushMolecule.waitForPendingJobs(deadline),
      ]);

      webPushMolecule.close();
      db.close();
      logger.info("Database connection closed");
      clearForceExitTimer();
      process.exit(0);
    } catch (error: unknown) {
      clearForceExitTimer();
      logger.error("Graceful shutdown failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      try {
        webPushMolecule.close();
      } catch (closeError: unknown) {
        logger.error("Web Push close failed", {
          error:
            closeError instanceof Error
              ? closeError.message
              : String(closeError),
        });
      }

      try {
        db.close();
        logger.info("Database connection closed");
      } catch (closeError: unknown) {
        logger.error("Database close failed", {
          error:
            closeError instanceof Error
              ? closeError.message
              : String(closeError),
        });
      }

      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error("Failed to start server", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
