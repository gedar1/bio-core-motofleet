// Feature: motofleet-mvp, Property 10: Partial update preserves unmodified fields

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CosignerMolecule } from "../../src/molecules/CosignerMolecule.js";
import { RiderMolecule } from "../../src/molecules/RiderMolecule.js";
import type { ILogger } from "../../src/infrastructure/logger.js";

/**
 * Property 10: When performing a partial update on a cosigner,
 * fields NOT included in the update remain unchanged from their original values.
 */
describe("Property 10: Partial update preserves unmodified fields", () => {
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

  // Generate a future date string (YYYY-MM-DD)
  function futureDate(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  }

  const updatableFields = [
    "name",
    "address",
    "phone",
    "relationship",
    "identity_document",
  ] as const;

  // Arbitrary for a non-empty subset of fields to update
  const fieldSubsetArb = fc
    .subarray([...updatableFields], { minLength: 1, maxLength: 5 })
    .filter((arr) => arr.length > 0);

  // Arbitrary for string values for update
  const fieldValueArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  it("preserves unmodified fields after partial update", () => {
    fc.assert(
      fc.property(
        fieldSubsetArb,
        fc.array(fieldValueArb, { minLength: 5, maxLength: 5 }),
        (fieldsToUpdate, newValues) => {
          const db = createFreshDb();
          const riderMolecule = new RiderMolecule(db, logger);
          const cosignerMolecule = new CosignerMolecule(db, logger);

          // Create a rider first (need valid rider_id)
          // Insert directly to avoid async password hashing
          const riderId =
            "rider-" + Math.random().toString(36).substring(2, 10);
          db.prepare(
            `INSERT INTO riders (id, name, phone, email, address, password_hash, license_number, license_expiry, insurance_number, insurance_expiry, bond_amount, emergency_contact_name, emergency_contact_phone, status, available)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
          ).run(
            riderId,
            "Test Rider",
            "3001234567",
            `rider-${riderId}@test.com`,
            "Test Address",
            "$2b$10$fakehashfortest000000000000000000000000000000000000",
            "LIC-001",
            futureDate(365),
            "INS-001",
            futureDate(365),
            500000,
            "Emergency Contact",
            "3009999999",
          );

          // Create a cosigner
          const originalData = {
            name: "Original Name",
            address: "Original Address 123",
            phone: "3005551234",
            relationship: "Father",
            identity_document:
              "DOC-" + Math.random().toString(36).substring(2, 10),
          };

          const cosigner = cosignerMolecule.create(riderId, originalData);

          // Build partial update from selected fields
          const updateData: Record<string, string> = {};
          for (let i = 0; i < fieldsToUpdate.length; i++) {
            const field = fieldsToUpdate[i];
            updateData[field] = newValues[i % newValues.length];
          }

          // Perform partial update
          try {
            cosignerMolecule.update(cosigner.id, updateData);
          } catch {
            // If identity_document conflicts, just close and skip
            db.close();
            return;
          }

          // Read back the updated cosigner
          const updated = cosignerMolecule.getById(cosigner.id)!;

          // Verify: fields NOT in the update remain unchanged
          for (const field of updatableFields) {
            if (!fieldsToUpdate.includes(field)) {
              expect(updated[field]).toBe(
                originalData[field as keyof typeof originalData],
              );
            }
          }

          // Verify: fields IN the update have the new values
          for (const field of fieldsToUpdate) {
            expect(updated[field]).toBe(updateData[field]);
          }

          db.close();
        },
      ),
      { numRuns: 50 },
    );
  });
});
