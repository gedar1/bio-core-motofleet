import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { RiderMolecule } from "../../src/molecules/RiderMolecule.js";
import { runMigrations } from "../../src/infrastructure/database.js";
import type { ILogger } from "../../src/infrastructure/logger.js";

const TEST_DB_PATH = path.resolve("data/test-rider-identity.db");
const INITIAL_MIGRATION = path.resolve("src/migrations/001_initial.sql");
const MIGRATIONS_DIR = path.resolve("src/migrations");

const mockLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => mockLogger,
};

const riderInput = {
  name: "María Pérez",
  phone: "3001234567",
  email: "maria@example.com",
  address: "Calle 10 # 20-30",
  password: "SecurePass1",
  document_type: "CC" as const,
  document_number: "ab-12345",
  license_number: "LIC-12345",
  license_expiry: "2099-01-01",
  insurance_number: "SEG-12345",
  insurance_expiry: "2099-01-01",
  bond_amount: 500000,
  emergency_contact_name: "Ana Pérez",
  emergency_contact_phone: "3201234567",
};

describe("rider identity document migration and persistence", () => {
  let db: Database.Database;
  let riders: RiderMolecule;

  beforeEach(() => {
    fs.rmSync(TEST_DB_PATH, { force: true });
    db = new Database(TEST_DB_PATH);
    db.exec(fs.readFileSync(INITIAL_MIGRATION, "utf-8"));
    db.exec(
      "CREATE TABLE _migrations (filename TEXT PRIMARY KEY, executed_at TEXT NOT NULL DEFAULT (datetime('now'))) ",
    );
    db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(
      "001_initial.sql",
    );
    runMigrations(db, MIGRATIONS_DIR);
    riders = new RiderMolecule(db, mockLogger);
  });

  afterEach(() => {
    db.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true });
    }
  });

  it("keeps legacy riders readable with pending identity fields", () => {
    db.prepare(
      `INSERT INTO riders (
        id, name, phone, email, address, password_hash, license_number,
        license_expiry, insurance_number, insurance_expiry, bond_amount,
        emergency_contact_name, emergency_contact_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "legacy-rider",
      "Rider Histórico",
      "3111234567",
      "legacy@example.com",
      "Carrera 1 # 2-3",
      "hash",
      "LIC-LEGACY",
      "2099-01-01",
      "SEG-LEGACY",
      "2099-01-01",
      500000,
      "Contacto Histórico",
      "3201234567",
    );

    expect(riders.getById("legacy-rider")).toMatchObject({
      document_type: null,
      document_number: null,
    });
  });

  it("normalizes and persists documents while rejecting duplicate pairs", async () => {
    const first = await riders.register(riderInput);
    expect(first.document_type).toBe("CC");
    expect(first.document_number).toBe("AB-12345");

    await expect(
      riders.register({
        ...riderInput,
        phone: "3121234567",
        email: "other@example.com",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Identity document is already registered",
    });

    const second = await riders.register({
      ...riderInput,
      phone: "3131234567",
      email: "third@example.com",
      document_type: "CE",
    });
    expect(() =>
      db
        .prepare("UPDATE riders SET document_type = ? WHERE id = ?")
        .run("CC", second.id),
    ).toThrow(/UNIQUE constraint failed/);
  });
});
