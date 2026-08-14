import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const initialMigrationPath = path.join(
  projectRoot,
  "src",
  "migrations",
  "001_initial.sql",
);
const routeMigrationPath = path.join(
  projectRoot,
  "src",
  "migrations",
  "003_add_errand_route_snapshot_and_cop.sql",
);
const timestamp = "2024-01-02 03:04:05";
const databasePath = path.join(
  os.tmpdir(),
  `motofleet-route-migration-${randomUUID()}.db`,
);

function extractBackfillUpdate(migrationSql) {
  const updateStart = migrationSql.indexOf("UPDATE errands");
  const verificationStart = migrationSql.indexOf(
    "-- Verification after migration",
  );

  assert.ok(
    updateStart >= 0 && verificationStart > updateStart,
    "Could not extract the route snapshot backfill UPDATE",
  );

  return migrationSql.slice(updateStart, verificationStart).trim();
}

function snapshot(row) {
  return {
    estimated_distance_km: row.estimated_distance_km,
    estimated_duration_minutes: row.estimated_duration_minutes,
    routing_provider: row.routing_provider,
    routing_profile: row.routing_profile,
    route_calculated_at: row.route_calculated_at,
    fare_cop: row.fare_cop,
    platform_commission_cop: row.platform_commission_cop,
    rider_earnings_cop: row.rider_earnings_cop,
  };
}

let db;
try {
  const [initialMigration, routeMigration] = await Promise.all([
    readFile(initialMigrationPath, "utf8"),
    readFile(routeMigrationPath, "utf8"),
  ]);
  const backfillUpdate = extractBackfillUpdate(routeMigration);

  db = new Database(databasePath);
  db.exec(initialMigration);

  db.prepare(
    `INSERT INTO users (
      id, name, phone, email, address, password_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "legacy-user",
    "Legacy User",
    "+570000000000",
    "legacy@example.test",
    "Legacy address",
    "legacy-password-hash",
    timestamp,
    timestamp,
  );

  db.prepare(
    `INSERT INTO errands (
      id, user_id, type, description, origin_address, destination_address,
      estimated_distance, fare, platform_commission, rider_earnings,
      status, payment_method, requested_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "legacy-errand",
    "legacy-user",
    "errand",
    "Legacy errand",
    "Origin",
    "Destination",
    12.34,
    1000.5,
    125.5,
    875,
    "requested",
    "cash",
    timestamp,
    timestamp,
    timestamp,
  );

  db.exec(routeMigration);

  const selectSnapshot = db.prepare(
    `SELECT estimated_distance_km, estimated_duration_minutes, routing_provider,
      routing_profile, route_calculated_at, fare_cop, platform_commission_cop,
      rider_earnings_cop
     FROM errands WHERE id = ?`,
  );
  const expected = {
    estimated_distance_km: 12.34,
    estimated_duration_minutes: null,
    routing_provider: "legacy",
    routing_profile: "legacy",
    route_calculated_at: timestamp,
    fare_cop: 1001,
    platform_commission_cop: 126,
    rider_earnings_cop: 875,
  };
  const firstSnapshot = snapshot(selectSnapshot.get("legacy-errand"));
  assert.deepEqual(
    firstSnapshot,
    expected,
    "Initial migration snapshot is incorrect",
  );

  db.exec(backfillUpdate);
  const secondSnapshot = snapshot(selectSnapshot.get("legacy-errand"));
  assert.deepEqual(
    secondSnapshot,
    firstSnapshot,
    "Backfill UPDATE is not idempotent",
  );

  console.log(
    JSON.stringify({ ok: true, migration: "14.7", idempotent: true }),
  );
} catch (error) {
  console.error(
    JSON.stringify({ ok: false, migration: "14.7", error: error.message }),
  );
  process.exitCode = 1;
} finally {
  try {
    db?.close();
  } finally {
    await rm(databasePath, { force: true });
  }
}
