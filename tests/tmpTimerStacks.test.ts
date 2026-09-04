import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "../src/index.js";

const MIGRATIONS_DIR = path.resolve("src/migrations");

let root: string | undefined;
let runtime: Awaited<ReturnType<typeof createApplication>> | undefined;

afterEach(async () => {
  if (runtime) await runtime.shutdown();
  runtime = undefined;
  vi.useRealTimers();
  if (root) await fs.rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("application logging lifecycle", () => {
  it("flushes and closes Pino transports with the runtime", async () => {
    vi.useFakeTimers();
    root = await fs.mkdtemp(path.join(os.tmpdir(), "motofleet-timer-stack-"));
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
      NODE_ENV: "test",
    };
    runtime = await createApplication({
      env,
      dbPath: env.DB_PATH,
      migrationsDir: MIGRATIONS_DIR,
    });

    await request(runtime.app).get("/api/contract-signatures/review");
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    await runtime.shutdown();

    expect(runtime.scheduler.list()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(runtime.db.open).toBe(false);

    // A second call is a no-op and cannot reopen a thread-stream.
    await runtime.shutdown();
    expect(vi.getTimerCount()).toBe(0);
  });
});
