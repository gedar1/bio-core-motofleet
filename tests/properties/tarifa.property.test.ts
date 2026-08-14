// Feature: motofleet-mvp, Property 1: Cálculo de tarifa COP — correctitud y conservación
// Feature: motofleet-mvp, Property 3: Redondeo half-up determinista

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateFare,
  roundHalfUp,
  type PricingInput,
} from "../../src/atoms/tarifa.js";

const pricingInputArb: fc.Arbitrary<PricingInput> = fc.record({
  baseRateCop: fc.integer({ min: 1, max: 999_999 }),
  ratePerKmCop: fc.integer({ min: 0, max: 9_999 }),
  commissionBasisPoints: fc.integer({ min: 100, max: 5_000 }),
  distanceKm: fc.double({ min: 0, max: 1_000, noNaN: true }),
});

describe("Property 1: Cálculo de tarifa COP — correctitud y conservación", () => {
  it("rounds the variable component once and then the commission once", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        const result = calculateFare(input);
        const effectiveDistance = Math.max(0.5, input.distanceKm);
        const expectedFare =
          input.baseRateCop +
          roundHalfUp(input.ratePerKmCop * effectiveDistance);
        const expectedCommission = roundHalfUp(
          (expectedFare * input.commissionBasisPoints) / 10_000,
        );

        expect(result.fareCop).toBe(expectedFare);
        expect(result.platformCommissionCop).toBe(expectedCommission);
        expect(result.riderEarningsCop).toBe(
          result.fareCop - result.platformCommissionCop,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("preserves COP as safe integers with exact conservation", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        const result = calculateFare(input);

        expect(Number.isSafeInteger(result.fareCop)).toBe(true);
        expect(Number.isSafeInteger(result.platformCommissionCop)).toBe(true);
        expect(Number.isSafeInteger(result.riderEarningsCop)).toBe(true);
        expect(result.fareCop).toBe(
          result.platformCommissionCop + result.riderEarningsCop,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("is deterministic for identical inputs", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        expect(calculateFare(input)).toStrictEqual(calculateFare(input));
      }),
      { numRuns: 100 },
    );
  });

  it("applies the 0.5 km minimum before calculating the variable component", () => {
    fc.assert(
      fc.property(
        fc.record({
          baseRateCop: fc.integer({ min: 1, max: 999_999 }),
          ratePerKmCop: fc.integer({ min: 0, max: 9_999 }),
          commissionBasisPoints: fc.integer({ min: 100, max: 5_000 }),
          distanceKm: fc.double({ min: 0, max: 0.499_999, noNaN: true }),
        }),
        (input) => {
          const belowMinimum = calculateFare(input);
          const atMinimum = calculateFare({ ...input, distanceKm: 0.5 });
          expect(belowMinimum).toStrictEqual(atMinimum);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Property 3: Redondeo half-up determinista", () => {
  it("rounds exact half values up to the next COP", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9_999_999 }), (integerPart) => {
        expect(roundHalfUp(integerPart + 0.5)).toBe(integerPart + 1);
      }),
      { numRuns: 100 },
    );
  });

  it("is idempotent and always returns a safe integer", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 9_999_999, noNaN: true }),
        (value) => {
          const once = roundHalfUp(value);
          expect(roundHalfUp(once)).toBe(once);
          expect(Number.isSafeInteger(once)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
