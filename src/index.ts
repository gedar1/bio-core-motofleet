import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, type MoleculeContainer } from "./app.js";
import {
  createDatabase,
  runMigrations,
  closeDatabase,
} from "./infrastructure/database.js";
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
import { MetricsMolecule } from "./molecules/MetricsMolecule.js";
import { MapboxRoutingProvider } from "./infrastructure/routing/MapboxRoutingProvider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger("server");

async function main(): Promise<void> {
  // --- Load environment ---
  const port = parseInt(process.env.PORT || "3000", 10);
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
  const inAppNotificationMolecule = new InAppNotificationMolecule(
    db,
    createLogger("InAppNotificationMolecule"),
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
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    scheduler.shutdown();

    server.close(() => {
      logger.info("HTTP server closed");
      closeDatabase();
      logger.info("Database connection closed");
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error("Failed to start server", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
