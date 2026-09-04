import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { createApp, type MoleculeContainer } from "./app.js";
import { createDatabase, runMigrations } from "./infrastructure/database.js";
import {
  createLogger,
  shutdownLoggerLifecycle,
  startLoggerLifecycle,
} from "./infrastructure/logger.js";
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
import { createConfiguredDocumentStorage } from "./infrastructure/DocumentStorageFactory.js";
import { ContractSignatureMolecule } from "./molecules/ContractSignatureMolecule.js";
import { PdfValidator } from "./infrastructure/PdfValidator.js";
import { TokenService } from "./infrastructure/TokenService.js";
import { ContractAuditService } from "./infrastructure/ContractAuditService.js";
import { ContractEmailService } from "./infrastructure/ContractEmailService.js";
import { ContractEmailWorker } from "./infrastructure/ContractEmailWorker.js";
import { StorageReconciler } from "./infrastructure/StorageReconciler.js";
import {
  ContractSignatureSchedulerJobs,
  readSchedulerIntervals,
  readStorageRetentionPolicy,
  registerContractSignatureJobs,
} from "./infrastructure/ContractSignatureScheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger("server");

/** Observable checkpoints used by startup smoke tests and operational hooks. */
export type ApplicationStartupStep =
  | "database"
  | "migrations"
  | "configuration"
  | "dependencies"
  | "container"
  | "routes"
  | "jobs";

export interface ApplicationOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly dbPath?: string;
  readonly migrationsDir?: string;
  readonly publicRoot?: string;
  readonly servedRoot?: string;
  readonly onStartupStep?: (step: ApplicationStartupStep) => void;
}

export interface ApplicationRuntime {
  readonly app: ReturnType<typeof createApp>;
  readonly db: Database.Database;
  readonly molecules: MoleculeContainer;
  readonly scheduler: Scheduler;
  /** Stops jobs, closes SQLite, and flushes/closes owned log transports. */
  shutdown(): Promise<void>;
}

/**
 * Builds the complete application without opening an HTTP listener.
 *
 * The order is deliberate and is part of the safety contract:
 * SQLite/PRAGMA -> migrations -> repository/capacity/retention validation ->
 * injected dependencies -> molecule container -> routes -> scheduler jobs.
 * Keeping listener creation outside this function guarantees that an invalid
 * repository configuration cannot accept traffic.
 */
export async function createApplication(
  options: ApplicationOptions = {},
): Promise<ApplicationRuntime> {
  startLoggerLifecycle();
  const env = options.env ?? process.env;
  const dbPath =
    options.dbPath ?? env.DB_PATH ?? path.resolve("data/motofleet.db");
  const migrationsDir =
    options.migrationsDir ?? path.resolve(__dirname, "migrations");
  const markStep = (step: ApplicationStartupStep): void => {
    options.onStartupStep?.(step);
  };

  let db: Database.Database | undefined;
  let scheduler: Scheduler | undefined;

  try {
    // 1. Open exactly one connection. createDatabase enables foreign keys
    // before this connection is made available to any dependency.
    logger.info("Initializing database", { configured: true });
    db = createDatabase(dbPath);
    markStep("database");

    // 2. Apply every pending migration before constructing domain services.
    runMigrations(db, migrationsDir);
    markStep("migrations");

    // 3. Fail closed on repository, quota, retention, or interval settings.
    // The capacity monitor is initialized here, before routes or a listener.
    const configuredDocumentStorage = await createConfiguredDocumentStorage({
      env,
      publicRoot: options.publicRoot ?? path.resolve("public"),
      servedRoot: options.servedRoot ?? path.resolve("frontend", "dist"),
      referencedStorageKeys: async () => {
        const rows = db!
          .prepare(
            "SELECT storage_key FROM contract_document_versions WHERE storage_status IN ('pending', 'ready', 'retained')",
          )
          .all() as Array<{ storage_key: string }>;
        return new Set(rows.map((row) => row.storage_key));
      },
    });
    const storageRetentionPolicy = readStorageRetentionPolicy(env);
    const schedulerIntervals = readSchedulerIntervals(env);
    markStep("configuration");

    // 4. Construct all injected dependencies against the same SQLite handle.
    const documentStorage = configuredDocumentStorage.storage;
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

    if (!env.MAPBOX_SECRET_TOKEN?.trim()) {
      throw new Error(
        "MAPBOX_SECRET_TOKEN must be configured for Mapbox routing",
      );
    }

    const routingProvider = new MapboxRoutingProvider();
    const allowHaversineFallback =
      env.ROUTING_ALLOW_HAVERSINE_FALLBACK === "true";
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

    const pdfValidator = new PdfValidator();
    const tokenService = new TokenService(db, {
      hmacSecret: env.CONTRACT_TOKEN_HMAC_SECRET,
      outboxEncryptionKey: env.CONTRACT_OUTBOX_ENCRYPTION_KEY,
    });
    const auditService = new ContractAuditService(db);
    const contractEmailService = new ContractEmailService(
      db,
      tokenService,
      createLogger("ContractEmailService"),
      { env },
    );
    const contractSignatureMolecule = new ContractSignatureMolecule(
      db,
      createLogger("ContractSignatureMolecule"),
      documentStorage,
      pdfValidator,
      tokenService,
      auditService,
      contractEmailService,
    );
    markStep("dependencies");

    // 5. Publish one container. BackupCoordinator is intentionally not created
    // here; backup/restore remains a separate operational workflow.
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
      contractSignatures: contractSignatureMolecule,
    };
    markStep("container");

    // 6. Mount routes only after storage has passed all startup checks. The
    // existing app-level error handler remains the final middleware.
    const app = createApp(molecules, db);
    markStep("routes");

    // 7. Register contract jobs only after migrations, dependency wiring,
    // container creation, and route mounting have completed.
    const applicationScheduler = new Scheduler(createLogger("Scheduler"));
    scheduler = applicationScheduler;
    const contractEmailWorker = new ContractEmailWorker(
      db,
      contractEmailService,
      auditService,
      { logger: createLogger("ContractEmailWorker") },
    );
    const storageReconciler = new StorageReconciler(
      db,
      documentStorage,
      auditService,
      storageRetentionPolicy,
      { processId: "storage-reconciler" },
    );
    const contractSchedulerJobs = new ContractSignatureSchedulerJobs({
      db,
      audit: auditService,
      storageReconciler,
      capacityMonitor: configuredDocumentStorage.capacityMonitor,
      outbox: contractEmailService,
      encryptOutboxPayload: (payload) =>
        tokenService.encryptOutboxPayload(payload),
      adminEmail: env.CONTRACT_ADMIN_EMAIL ?? env.ADMIN_EMAIL,
      logger: createLogger("ContractSignatureScheduler"),
      processId: "contract-signature-scheduler",
    });
    registerContractSignatureJobs({
      scheduler: applicationScheduler,
      emailWorker: contractEmailWorker,
      jobs: contractSchedulerJobs,
      intervals: schedulerIntervals,
      logger: createLogger("ContractSignatureScheduler"),
    });

    // Preserve the legacy maintenance jobs after the contract-signature jobs.
    applicationScheduler.register(
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

    if (env.EMAIL_NOTIFICATIONS_ENABLED === "true") {
      applicationScheduler.register(
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
    markStep("jobs");

    let shutdownPromise: Promise<void> | undefined;
    return {
      app,
      db,
      molecules,
      scheduler: applicationScheduler,
      shutdown: () => {
        if (shutdownPromise) return shutdownPromise;

        // Stop producers first, close the exact DB used by the app, then
        // flush/close the shared logging transport. The promise makes the
        // asynchronous thread-stream close observable to real callers while
        // the synchronous test transport completes during this call.
        applicationScheduler.shutdown();
        if (db && db.open) {
          db.close();
        }
        shutdownPromise = shutdownLoggerLifecycle();
        return shutdownPromise;
      },
    };
  } catch (error) {
    scheduler?.shutdown();
    if (db?.open) {
      db.close();
    }
    await shutdownLoggerLifecycle();
    throw error;
  }
}

async function main(): Promise<void> {
  const env = process.env;
  const port = parseInt(env.PORT || "3000", 10);
  const runtime = await createApplication();
  const server = runtime.app.listen(port, () => {
    logger.info(`MotoFleet MVP server running on port ${port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully...`);
    runtime.scheduler.shutdown();

    server.close(async () => {
      logger.info("HTTP server closed");
      await runtime.shutdown();
      logger.info("Database connection closed");
      process.exit(0);
    });

    // Keep the fallback timer out of the event loop when no shutdown is in
    // progress in tests or embedding processes.
    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      void runtime.shutdown().finally(() => process.exit(1));
    }, 10_000);
    forceExit.unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

const isMainModule =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
  main().catch((error) => {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : "Unknown startup error",
    });
    process.exit(1);
  });
}
