import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApplication,
  type ApplicationRuntime,
  type ApplicationStartupStep,
} from "../../src/index.js";

const ORIGINAL_ENV = { ...process.env };
const MIGRATIONS_DIR = path.resolve("src/migrations");
const CONTRACT_SIGNATURE_TABLES = [
  "contract_signature_cases",
  "contract_document_versions",
  "contract_delivery_attempts",
  "contract_verifications",
  "contract_audit_events",
  "contract_email_queue",
] as const;

function logTimerCount(label: string): void {
  console.log(`[timer-probe] ${label}: ${vi.getTimerCount()}`);
}

let temporaryRoots: string[] = [];
let runtime: ApplicationRuntime | undefined;

afterEach(async () => {
  if (runtime) await runtime.shutdown();
  runtime = undefined;
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

async function makeEnvironment(): Promise<{
  root: string;
  env: NodeJS.ProcessEnv;
  publicRoot: string;
  servedRoot: string;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "motofleet-startup-"));
  temporaryRoots.push(root);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DB_PATH: path.join(root, "motofleet.sqlite"),
    CONTRACT_DOCUMENTS_DIR: path.join(root, "contract-documents"),
    CONTRACT_DOCUMENTS_MAX_BYTES: String(100 * 1024 * 1024),
    CONTRACT_DOCUMENTS_MIN_AVAILABLE_BYTES: "1",
    CONTRACT_DOCUMENTS_TEMPORARY_MARGIN_BYTES: "1",
    CONTRACT_STORAGE_PROVIDER: "filesystem",
    CONTRACT_STORAGE_RECONCILIATION_INTERVAL_MS: "123456",
    CONTRACT_STORAGE_CAPACITY_INTERVAL_MS: "234567",
    CONTRACT_TOKEN_HMAC_SECRET: "startup-test-hmac-secret",
    // 32 bytes, base64-encoded: valid server-held AES-GCM key for the outbox.
    CONTRACT_OUTBOX_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    CONTRACT_ADMIN_EMAIL: "admin@fake.test",
    EMAIL_NOTIFICATIONS_ENABLED: "false",
    SMTP_HOST: "smtp.fake.test",
    SMTP_PORT: "2525",
    SMTP_FROM: "noreply@fake.test",
    SMTP_USER: "fake-user",
    SMTP_PASS: "fake-pass",
    MAPBOX_SECRET_TOKEN: "test-mapbox-token",
    JWT_SECRET: "test-jwt-secret",
  };
  Object.assign(process.env, env);
  return {
    root,
    env,
    publicRoot: path.join(root, "public"),
    servedRoot: path.join(root, "served"),
  };
}

describe("application startup integration", () => {
  it("initializes the safe order, schema, routes, configured jobs, and cleans timers", async () => {
    const configuration = await makeEnvironment();
    const steps: ApplicationStartupStep[] = [];
    vi.useFakeTimers();

    try {
      runtime = await createApplication({
        env: configuration.env,
        dbPath: configuration.env.DB_PATH,
        migrationsDir: MIGRATIONS_DIR,
        publicRoot: configuration.publicRoot,
        servedRoot: configuration.servedRoot,
        onStartupStep: (step) => steps.push(step),
      });
      logTimerCount("after createApplication");

      expect(steps).toEqual([
        "database",
        "migrations",
        "configuration",
        "dependencies",
        "container",
        "routes",
        "jobs",
      ]);
      expect(runtime.molecules.contractSignatures).toBeDefined();
      expect(runtime.db.open).toBe(true);
      expect(runtime.db.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(
        runtime.db
          .prepare("SELECT filename FROM _migrations WHERE filename = ?")
          .get("007_add_contract_signature_flow.sql"),
      ).toBeDefined();

      const tablePlaceholders = CONTRACT_SIGNATURE_TABLES.map(() => "?").join(
        ",",
      );
      const tables = runtime.db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${tablePlaceholders}) ORDER BY name`,
        )
        .all([...CONTRACT_SIGNATURE_TABLES]) as Array<{ name: string }>;
      expect(tables.map((table) => table.name)).toEqual(
        [...CONTRACT_SIGNATURE_TABLES].sort(),
      );

      const foreignKeyTargets = new Map(
        CONTRACT_SIGNATURE_TABLES.map((table) => [
          table,
          (
            runtime!.db
              .prepare(`PRAGMA foreign_key_list(${table})`)
              .all() as Array<{
              table: string;
            }>
          ).map((foreignKey) => foreignKey.table),
        ]),
      );
      expect(foreignKeyTargets.get("contract_signature_cases")).toEqual(
        expect.arrayContaining([
          "rental_contracts",
          "riders",
          "motorcycles",
          "admins",
          "contract_document_versions",
        ]),
      );
      expect(foreignKeyTargets.get("contract_document_versions")).toContain(
        "contract_signature_cases",
      );
      expect(foreignKeyTargets.get("contract_delivery_attempts")).toEqual(
        expect.arrayContaining([
          "contract_signature_cases",
          "contract_document_versions",
          "admins",
        ]),
      );
      expect(foreignKeyTargets.get("contract_verifications")).toEqual(
        expect.arrayContaining([
          "contract_signature_cases",
          "contract_document_versions",
          "admins",
        ]),
      );
      expect(foreignKeyTargets.get("contract_audit_events")).toEqual(
        expect.arrayContaining([
          "contract_signature_cases",
          "contract_document_versions",
          "contract_delivery_attempts",
        ]),
      );
      expect(foreignKeyTargets.get("contract_email_queue")).toEqual(
        expect.arrayContaining([
          "contract_signature_cases",
          "contract_delivery_attempts",
        ]),
      );

      for (const table of CONTRACT_SIGNATURE_TABLES) {
        const columns = runtime.db
          .prepare(`PRAGMA table_info(${table})`)
          .all() as Array<{
          type: string;
        }>;
        expect(
          columns.some((column) => column.type.toUpperCase().includes("BLOB")),
        ).toBe(false);
      }

      const documentRootPath = configuration.env.CONTRACT_DOCUMENTS_DIR!;
      const documentRootStats = await fs.stat(documentRootPath);
      expect(documentRootStats.isDirectory()).toBe(true);
      expect(path.relative(configuration.publicRoot, documentRootPath)).toMatch(
        /^\.\.(?:[\\\\/]|$)/,
      );
      expect(path.relative(configuration.servedRoot, documentRootPath)).toMatch(
        /^\.\.(?:[\\\\/]|$)/,
      );

      const scheduled = Object.fromEntries(
        runtime.scheduler.list().map((task) => [task.id, task]),
      );
      expect(Object.keys(scheduled).slice(0, 4)).toEqual([
        "contract-email-worker",
        "expire-contract-signature-links",
        "reconcile-contract-storage",
        "monitor-contract-storage-capacity",
      ]);
      expect(scheduled["contract-email-worker"]?.intervalMs).toBe(30_000);
      expect(scheduled["expire-contract-signature-links"]?.intervalMs).toBe(
        5 * 60_000,
      );
      expect(scheduled["reconcile-contract-storage"]?.intervalMs).toBe(123456);
      expect(scheduled["monitor-contract-storage-capacity"]?.intervalMs).toBe(
        234567,
      );
      expect(scheduled["expire-contracts"]).toBeDefined();
      // Legacy notification delivery remains conditional and is disabled in
      // this smoke environment; the contract outbox worker stays registered
      // but exits without SMTP delivery when disabled.
      expect(scheduled["process-notifications"]).toBeUndefined();

      const publicResponse = await request(runtime.app).get(
        "/public/contract-signatures/not-a-real-token",
      );
      logTimerCount("after public request: invalid token");
      expect(publicResponse.status).toBe(404);
      expect(publicResponse.headers["cache-control"]).toBe("no-store");
      expect(publicResponse.headers["referrer-policy"]).toBe("no-referrer");

      const queryTokenResponse = await request(runtime.app).get(
        "/public/contract-signatures/path-token?token=query-token",
      );
      logTimerCount("after public request: query token");
      expect(queryTokenResponse.status).toBe(404);
      expect(queryTokenResponse.headers["cache-control"]).toBe("no-store");
      expect(queryTokenResponse.headers["referrer-policy"]).toBe("no-referrer");

      let rateLimitedResponse = publicResponse;
      for (let attempt = 0; attempt < 11; attempt += 1) {
        rateLimitedResponse = await request(runtime.app).get(
          "/public/contract-signatures/rate-limit-token",
        );
        logTimerCount(`after public request: rate limit ${attempt + 1}`);
      }
      logTimerCount("after rate-limit loop");
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.headers["retry-after"]).toBeDefined();
      expect(rateLimitedResponse.headers["cache-control"]).toBe("no-store");

      const adminResponse = await request(runtime.app).get(
        "/api/contract-signatures/review",
      );
      logTimerCount("after /api/contract-signatures/review");
      expect(adminResponse.status).toBe(401);

      // Existing legacy routes remain mounted and protected by their original
      // authorization boundary; no signature case is required for this check.
      const legacyResponse = await request(runtime.app).get("/api/contracts");
      logTimerCount("after /api/contracts");
      expect(legacyResponse.status).toBe(401);

      expect(vi.getTimerCount()).toBeGreaterThan(0);
      logTimerCount("before runtime.scheduler.shutdown");
      runtime.scheduler.shutdown();
      logTimerCount("after runtime.scheduler.shutdown");
      await runtime.shutdown();
      logTimerCount("after runtime.shutdown");
      expect(runtime.scheduler.list()).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
      expect(runtime.db.open).toBe(false);
      runtime = undefined;
    } finally {
      if (runtime) await runtime.shutdown();
      runtime = undefined;
      vi.useRealTimers();
    }
  });

  it("rejects a repository inside a public root before building routes or jobs", async () => {
    const configuration = await makeEnvironment();
    const steps: ApplicationStartupStep[] = [];
    const unsafeRoot = path.join(configuration.publicRoot, "documents");

    await expect(
      createApplication({
        env: { ...configuration.env, CONTRACT_DOCUMENTS_DIR: unsafeRoot },
        dbPath: configuration.env.DB_PATH,
        migrationsDir: MIGRATIONS_DIR,
        publicRoot: configuration.publicRoot,
        servedRoot: configuration.servedRoot,
        onStartupStep: (step) => steps.push(step),
      }),
    ).rejects.toThrow("CONTRACT_DOCUMENTS_DIR");

    expect(steps).toEqual(["database", "migrations"]);
  });

  it("rejects an invalid quota/margin before constructing the container", async () => {
    const configuration = await makeEnvironment();
    const steps: ApplicationStartupStep[] = [];

    await expect(
      createApplication({
        env: {
          ...configuration.env,
          CONTRACT_DOCUMENTS_MAX_BYTES: "1",
          CONTRACT_DOCUMENTS_TEMPORARY_MARGIN_BYTES: "2",
        },
        dbPath: configuration.env.DB_PATH,
        migrationsDir: MIGRATIONS_DIR,
        publicRoot: configuration.publicRoot,
        servedRoot: configuration.servedRoot,
        onStartupStep: (step) => steps.push(step),
      }),
    ).rejects.toThrow();

    expect(steps).toEqual(["database", "migrations"]);
  });

  it("rejects a repository when the startup capacity reservation cannot be guaranteed", async () => {
    const configuration = await makeEnvironment();
    const steps: ApplicationStartupStep[] = [];

    await expect(
      createApplication({
        env: {
          ...configuration.env,
          CONTRACT_DOCUMENTS_MIN_AVAILABLE_BYTES: String(
            Number.MAX_SAFE_INTEGER,
          ),
        },
        dbPath: configuration.env.DB_PATH,
        migrationsDir: MIGRATIONS_DIR,
        publicRoot: configuration.publicRoot,
        servedRoot: configuration.servedRoot,
        onStartupStep: (step) => steps.push(step),
      }),
    ).rejects.toThrow();

    expect(steps).toEqual(["database", "migrations"]);
  });
});
