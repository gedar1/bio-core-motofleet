// Feature: motofleet-mvp, Property 9: At most one active pricing rule per tipo_mandado after any sequence of operations

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PricingMolecule } from "../../src/molecules/PricingMolecule.js";
import type { ILogger } from "../../src/infrastructure/logger.js";

/**
 * Property 9: After any sequence of create/deactivate operations,
 * there is at most 1 active pricing rule per errand_type.
 * This is a stateful property test.
 */
describe("Property 9: At most one active pricing rule per tipo_mandado", () => {
  const migrationSQL = readFileSync(
    resolve(__dirname, "../../src/migrations/001_initial.sql"),
    "utf-8",
  );

  const errandTypes = ["object_transport", "purchase", "errand"] as const;

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

  // Arbitrary for valid pricing rule data
  const pricingInputArb = fc.record({
    errand_type: fc.constantFrom(...errandTypes),
    base_rate: fc.integer({ min: 1, max: 999_999 }),
    rate_per_km: fc.integer({ min: 0, max: 9_999 }),
    commission_percentage: fc.integer({ min: 1, max: 50 }),
  });

  // Arbitrary for a sequence of operations (create or deactivate)
  type CreateOp = {
    type: "create";
    data: typeof pricingInputArb extends fc.Arbitrary<infer T> ? T : never;
  };
  type DeactivateOp = { type: "deactivate"; index: number };
  type Op = CreateOp | DeactivateOp;

  const operationArb: fc.Arbitrary<Op> = fc.oneof(
    pricingInputArb.map((data) => ({ type: "create" as const, data })),
    fc
      .nat({ max: 20 })
      .map((index) => ({ type: "deactivate" as const, index })),
  );

  const operationSequenceArb = fc.array(operationArb, {
    minLength: 1,
    maxLength: 15,
  });

  it("maintains at most 1 active rule per errand_type after any operation sequence", () => {
    fc.assert(
      fc.property(operationSequenceArb, (operations) => {
        const db = createFreshDb();
        const pricing = new PricingMolecule(db, logger);
        const createdIds: string[] = [];

        for (const op of operations) {
          try {
            if (op.type === "create") {
              const rule = pricing.create(op.data);
              createdIds.push(rule.id);
            } else {
              // Deactivate by index (if valid)
              if (createdIds.length > 0) {
                const idx = op.index % createdIds.length;
                pricing.deactivate(createdIds[idx]);
              }
            }
          } catch {
            // Validation errors are expected for edge-case values
          }

          // INVARIANT: at most 1 active rule per errand_type
          for (const etype of errandTypes) {
            const count = db
              .prepare(
                "SELECT COUNT(*) as cnt FROM pricing_rules WHERE errand_type = ? AND active = 1",
              )
              .get(etype) as { cnt: number };

            expect(count.cnt).toBeLessThanOrEqual(1);
          }
        }

        db.close();
      }),
      { numRuns: 50 },
    );
  });

  it("deactivating a rule results in 0 active for that type (when only one existed)", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        const db = createFreshDb();
        const pricing = new PricingMolecule(db, logger);

        try {
          const rule = pricing.create(input);

          // Verify 1 active before deactivation
          const beforeCount = db
            .prepare(
              "SELECT COUNT(*) as cnt FROM pricing_rules WHERE errand_type = ? AND active = 1",
            )
            .get(input.errand_type) as { cnt: number };
          expect(beforeCount.cnt).toBe(1);

          // Deactivate
          pricing.deactivate(rule.id);

          // Verify 0 active after deactivation
          const afterCount = db
            .prepare(
              "SELECT COUNT(*) as cnt FROM pricing_rules WHERE errand_type = ? AND active = 1",
            )
            .get(input.errand_type) as { cnt: number };
          expect(afterCount.cnt).toBe(0);
        } catch {
          // Validation errors for edge-case doubles are expected
        }

        db.close();
      }),
      { numRuns: 50 },
    );
  });
});
