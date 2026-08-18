import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { createDatabase, runMigrations } from "../infrastructure/database.js";
import { hashPassword, isValidPassword } from "../atoms/password.js";

const CONFIRMATION = "motofleet-demo-v1";
const password = process.env.DEMO_SEED_PASSWORD;

if (process.env.DEMO_SEED_CONFIRM !== CONFIRMATION) {
  throw new Error(
    `Refusing to seed: set DEMO_SEED_CONFIRM=${CONFIRMATION} explicitly`,
  );
}
if (!password || !isValidPassword(password)) {
  throw new Error(
    "DEMO_SEED_PASSWORD must be 8-72 characters with upper, lower and digit",
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH ?? path.resolve("data/motofleet.db");
const db = createDatabase(dbPath);
const migrationsDir = path.resolve(__dirname, "../migrations");

const outcomes: Record<string, "created" | "skipped"> = {};

try {
  runMigrations(db, migrationsDir);
  const passwordHash = await hashPassword(password);
  const seed = db.transaction(() => {
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users
        (id, name, phone, email, address, password_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);
    outcomes.user =
      insertUser.run(
        "demo-user-v1",
        "Usuario Demo",
        "3000000001",
        "user.demo@motofleet.invalid",
        "Calle Demo 1",
        passwordHash,
      ).changes === 1
        ? "created"
        : "skipped";

    const insertRider = db.prepare(`
      INSERT OR IGNORE INTO riders (
        id, name, phone, email, address, password_hash, document_type,
        document_number, license_number, license_expiry, insurance_number,
        insurance_expiry, bond_amount, emergency_contact_name,
        emergency_contact_phone, status, available
      ) VALUES (?, ?, ?, ?, ?, ?, 'CC', ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)
    `);
    outcomes.rider =
      insertRider.run(
        "demo-rider-v1",
        "Rider Demo",
        "3000000002",
        "rider.demo@motofleet.invalid",
        "Carrera Demo 2",
        passwordHash,
        "DEMO-RIDER-001",
        "LIC-DEMO-001",
        "2028-12-31",
        "SOAT-DEMO-001",
        "2028-12-31",
        500_000,
        "Contacto Demo",
        "3000000003",
      ).changes === 1
        ? "created"
        : "skipped";

    const insertAdmin = db.prepare(`
      INSERT OR IGNORE INTO admins
        (id, name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'superadmin', 'active')
    `);
    outcomes.admin =
      insertAdmin.run(
        "demo-admin-v1",
        "Admin Demo",
        "admin.demo@motofleet.invalid",
        passwordHash,
      ).changes === 1
        ? "created"
        : "skipped";

    const insertPricingRule = db.prepare(`
      INSERT INTO pricing_rules
        (id, errand_type, base_rate, rate_per_km, commission_percentage, active)
      SELECT ?, ?, 5000, 1500, 15, 1
      WHERE NOT EXISTS (
        SELECT 1 FROM pricing_rules WHERE errand_type = ? AND active = 1
      )
    `);
    for (const errandType of ["object_transport", "purchase", "errand"]) {
      outcomes[`pricing:${errandType}`] =
        insertPricingRule.run(uuidv4(), errandType, errandType).changes === 1
          ? "created"
          : "skipped";
    }
  });

  seed();
  console.log(
    JSON.stringify({ ok: true, seed: "motofleet-demo-v1", outcomes }),
  );
} finally {
  db.close();
}
