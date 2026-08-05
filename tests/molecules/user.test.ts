import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { UserMolecule } from "../../src/molecules/UserMolecule.js";
import type { ILogger } from "../../src/infrastructure/logger.js";

const TEST_DB_PATH = path.resolve("data/test-user-molecule.db");
const MIGRATIONS_PATH = path.resolve("src/migrations/001_initial.sql");

/** Minimal logger mock */
const mockLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => mockLogger,
};

function createTestDb(): Database.Database {
  const db = new Database(TEST_DB_PATH);
  db.pragma("journal_mode = WAL");
  const sql = fs.readFileSync(MIGRATIONS_PATH, "utf-8");
  db.exec(sql);
  return db;
}

describe("UserMolecule", () => {
  let db: Database.Database;
  let molecule: UserMolecule;

  beforeEach(() => {
    db = createTestDb();
    molecule = new UserMolecule(db, mockLogger);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe("register", () => {
    const validInput = {
      name: "Juan Pérez",
      phone: "3001234567",
      email: "juan@example.com",
      address: "Calle 123 #45-67",
      password: "SecurePass1",
    };

    it("should register a new user with status active", async () => {
      const user = await molecule.register(validInput);

      expect(user).toBeDefined();
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(user.name).toBe(validInput.name);
      expect(user.phone).toBe(validInput.phone);
      expect(user.email).toBe(validInput.email);
      expect(user.address).toBe(validInput.address);
      expect(user.status).toBe("active");
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(validInput.password);
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });

    it("should throw 409 CONFLICT when email already exists", async () => {
      await molecule.register(validInput);

      await expect(
        molecule.register({ ...validInput, phone: "3119876543" }),
      ).rejects.toMatchObject({
        status: 409,
        code: "CONFLICT",
        message: "Email is already in use",
      });
    });

    it("should throw 409 CONFLICT when phone already exists", async () => {
      await molecule.register(validInput);

      await expect(
        molecule.register({ ...validInput, email: "other@example.com" }),
      ).rejects.toMatchObject({
        status: 409,
        code: "CONFLICT",
        message: "Phone is already in use",
      });
    });

    it("should hash the password with bcrypt", async () => {
      const user = await molecule.register(validInput);
      expect(user.password_hash.startsWith("$2b$")).toBe(true);
    });
  });

  describe("getById", () => {
    it("should return the user when found", async () => {
      const registered = await molecule.register({
        name: "María López",
        phone: "3201112233",
        email: "maria@example.com",
        address: "Carrera 10 #20-30",
        password: "StrongPass1",
      });

      const found = molecule.getById(registered.id);
      expect(found).not.toBeNull();
      expect(found!.email).toBe("maria@example.com");
    });

    it("should return null when user not found", () => {
      const found = molecule.getById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("getByEmail", () => {
    it("should return the user when found by email", async () => {
      await molecule.register({
        name: "Carlos Gómez",
        phone: "3104445566",
        email: "carlos@example.com",
        address: "Avenida 5 #12-34",
        password: "MyPass123",
      });

      const found = molecule.getByEmail("carlos@example.com");
      expect(found).not.toBeNull();
      expect(found!.name).toBe("Carlos Gómez");
    });

    it("should return null when email not found", () => {
      const found = molecule.getByEmail("nobody@example.com");
      expect(found).toBeNull();
    });
  });
});
