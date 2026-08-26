import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { createLogger } from "./logger.js";

const log = createLogger("database");

/**
 * Creates a new SQLite database connection with WAL mode enabled.
 * Ensures the directory for the database file exists before creating it.
 */
export function createDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  log.info("Database connection opened", { path: dbPath, mode: "WAL" });
  return db;
}

/**
 * Executes SQL migration files from the given directory.
 * Tracks which migrations have been run in a `_migrations` table to ensure
 * each migration is only executed once (idempotent on restart).
 */
export function runMigrations(
  db: Database.Database,
  migrationsDir: string,
): void {
  if (!fs.existsSync(migrationsDir)) {
    log.warn("Migrations directory not found, skipping", {
      dir: migrationsDir,
    });
    return;
  }

  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => {
      const numA = Number.parseInt(a.split("_")[0], 10);
      const numB = Number.parseInt(b.split("_")[0], 10);
      return numA - numB;
    });

  if (files.length === 0) {
    log.info("No migration files found", { dir: migrationsDir });
    return;
  }

  // Get already-executed migrations
  const executed = new Set(
    (
      db.prepare("SELECT filename FROM _migrations").all() as Array<{
        filename: string;
      }>
    ).map((row) => row.filename),
  );

  const pending = files.filter((f) => !executed.has(f));

  if (pending.length === 0) {
    log.info("All migrations already applied", { total: files.length });
    return;
  }

  const migrate = db.transaction(() => {
    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
      log.info("Migration executed", { file });
    }
  });

  migrate();
  log.info("All migrations completed", { count: pending.length });
}

/** Singleton database instance */
let instance: Database.Database | null = null;

/**
 * Returns the singleton database connection.
 * Lazy-initializes using DB_PATH from environment (defaults to ./data/motofleet.db).
 * Runs migrations from src/migrations/ on first initialization.
 */
export function getDatabase(): Database.Database {
  if (!instance) {
    const dbPath = process.env.DB_PATH || "./data/motofleet.db";
    instance = createDatabase(dbPath);

    const migrationsDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "../migrations",
    );
    runMigrations(instance, migrationsDir);
  }
  return instance;
}

/**
 * Closes the singleton database connection and resets the reference.
 * Safe to call even if no connection exists.
 */
export function closeDatabase(): void {
  if (instance) {
    instance.close();
    log.info("Database connection closed");
    instance = null;
  }
}
