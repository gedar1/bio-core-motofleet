// Feature: motofleet-mvp, Property 6: Validación de contraseña

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isValidPassword } from "../../src/atoms/password.js";

/**
 * Validates: Requirements 1.6, 2.4, 3.5
 *
 * Property 6: isValidPassword returns true IFF:
 * - 8 ≤ length ≤ 72
 * - Contains at least one uppercase [A-Z]
 * - Contains at least one lowercase [a-z]
 * - Contains at least one digit [0-9]
 */
describe("Property 6: Validación de contraseña", () => {
  /**
   * Manual reference implementation to compare against.
   */
  function manualPasswordCheck(password: string): boolean {
    if (password.length < 8 || password.length > 72) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
  }

  // Generator for valid passwords (always pass all 4 criteria)
  const validPasswordArb = fc
    .tuple(
      fc.integer({ min: 8, max: 72 }),
      fc.integer({ min: 0, max: 25 }), // uppercase letter index
      fc.integer({ min: 0, max: 25 }), // lowercase letter index
      fc.integer({ min: 0, max: 9 }), // digit
    )
    .chain(([length, upperIdx, lowerIdx, digit]) => {
      const upper = String.fromCharCode(65 + upperIdx); // A-Z
      const lower = String.fromCharCode(97 + lowerIdx); // a-z
      const digitChar = String(digit);
      const remaining = length - 3;
      // Fill rest with printable ASCII (mix of all categories)
      return fc
        .stringOf(
          fc.integer({ min: 33, max: 126 }).map((c) => String.fromCharCode(c)),
          { minLength: remaining, maxLength: remaining },
        )
        .map((rest) => upper + lower + digitChar + rest);
    });

  // Generator for random strings of any content
  const randomStringArb = fc.string({ minLength: 0, maxLength: 100 });

  it("matches manual check for random strings", () => {
    fc.assert(
      fc.property(randomStringArb, (password) => {
        const actual = isValidPassword(password);
        const expected = manualPasswordCheck(password);
        expect(actual).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("returns true for passwords meeting all criteria", () => {
    fc.assert(
      fc.property(validPasswordArb, (password) => {
        expect(isValidPassword(password)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("returns false when length < 8", () => {
    const shortPasswordArb = fc
      .string({ minLength: 0, maxLength: 7 })
      .map((s) => {
        // Ensure it has all required char types (so only length fails)
        if (s.length <= 4) return "Ab1" + s;
        return s;
      })
      .filter((s) => s.length < 8);

    fc.assert(
      fc.property(shortPasswordArb, (password) => {
        expect(isValidPassword(password)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("returns false when length > 72", () => {
    const longPasswordArb = fc
      .stringOf(
        fc.integer({ min: 33, max: 126 }).map((c) => String.fromCharCode(c)),
        { minLength: 73, maxLength: 100 },
      )
      .map((s) => "Ab1" + s); // Ensure other criteria met, only length fails

    fc.assert(
      fc.property(longPasswordArb, (password) => {
        expect(password.length).toBeGreaterThan(72);
        expect(isValidPassword(password)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("returns false when missing uppercase", () => {
    // Generate strings with only lowercase + digits (no uppercase)
    const noUpperArb = fc
      .stringOf(
        fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")),
        {
          minLength: 8,
          maxLength: 72,
        },
      )
      .filter((s) => /[a-z]/.test(s) && /[0-9]/.test(s) && !/[A-Z]/.test(s));

    fc.assert(
      fc.property(noUpperArb, (password) => {
        expect(isValidPassword(password)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("returns false when missing lowercase", () => {
    // Generate strings with only uppercase + digits (no lowercase)
    const noLowerArb = fc
      .stringOf(
        fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
        {
          minLength: 8,
          maxLength: 72,
        },
      )
      .filter((s) => /[A-Z]/.test(s) && /[0-9]/.test(s) && !/[a-z]/.test(s));

    fc.assert(
      fc.property(noLowerArb, (password) => {
        expect(isValidPassword(password)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("returns false when missing digit", () => {
    // Generate strings with only uppercase + lowercase (no digits)
    const noDigitArb = fc
      .stringOf(
        fc.constantFrom(
          ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
        ),
        {
          minLength: 8,
          maxLength: 72,
        },
      )
      .filter((s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && !/[0-9]/.test(s));

    fc.assert(
      fc.property(noDigitArb, (password) => {
        expect(isValidPassword(password)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: motofleet-mvp, Property 8: Auth rejection messages are generic and identical

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AuthMolecule } from "../../src/molecules/AuthMolecule.js";
import { hashPassword } from "../../src/atoms/password.js";
import type { ILogger } from "../../src/infrastructure/logger.js";

describe("Property 8: Auth rejection messages are generic and identical", () => {
  const migrationSQL = readFileSync(
    resolve(__dirname, "../../src/migrations/001_initial.sql"),
    "utf-8",
  );

  // Silent logger for tests
  const logger: ILogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => logger,
  };

  function createFreshDb(): InstanceType<typeof Database> {
    const db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.exec(migrationSQL);
    return db;
  }

  // Arbitrary for random emails that won't match the registered user
  const wrongEmailArb = fc
    .string({ minLength: 3, maxLength: 30 })
    .filter((s) => /^[a-z0-9]+$/.test(s))
    .map((s) => `${s}@wrong.com`);

  // Arbitrary for random wrong passwords
  const wrongPasswordArb = fc.string({ minLength: 1, maxLength: 50 });

  it("returns null for all invalid credential scenarios (no information leakage)", () => {
    fc.assert(
      fc.asyncProperty(
        wrongEmailArb,
        wrongPasswordArb,
        async (wrongEmail, wrongPassword) => {
          const db = createFreshDb();
          const auth = new AuthMolecule(db, logger);

          // Register a known user
          const knownEmail = "known-user@test.com";
          const knownPassword = "ValidPass1";
          const passwordHash = await hashPassword(knownPassword);

          db.prepare(
            `INSERT INTO users (id, name, phone, email, address, password_hash, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
          ).run(
            "user-001",
            "Known User",
            "3001111111",
            knownEmail,
            "Some Address",
            passwordHash,
          );

          // Scenario 1: Wrong email (user doesn't exist)
          const result1 = await auth.login(wrongEmail, knownPassword);

          // Scenario 2: Correct email, wrong password
          const result2 = await auth.login(knownEmail, wrongPassword);

          // Scenario 3: Wrong email AND wrong password
          const result3 = await auth.login(wrongEmail, wrongPassword);

          // All rejections must return null (same generic response, no info leakage)
          expect(result1).toBeNull();
          expect(result2).toBeNull();
          expect(result3).toBeNull();

          // All three scenarios produce identical response type (null)
          // No distinction between "user not found" vs "wrong password"
          expect(result1).toStrictEqual(result2);
          expect(result2).toStrictEqual(result3);

          db.close();
        },
      ),
      { numRuns: 50 },
    );
  });

  it("returns null for missing/empty credentials", () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom("", " ", "\t"),
        fc.constantFrom("", " ", "\t"),
        async (email, password) => {
          const db = createFreshDb();
          const auth = new AuthMolecule(db, logger);

          const result = await auth.login(email, password);

          // Empty credentials also return null (generic rejection)
          expect(result).toBeNull();

          db.close();
        },
      ),
      { numRuns: 50 },
    );
  });
});
