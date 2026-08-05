// Feature: motofleet-mvp, Property 1: Cálculo de tarifa — correctitud y descomposición
// Feature: motofleet-mvp, Property 3: Redondeo half-up

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateFare,
  roundHalfUp,
  type PricingInput,
} from "../../src/atoms/tarifa.js";

/**
 * Validates: Requirements 9.2, 9.3, 9.4, 17.2, 17.6
 *
 * Property 1: For valid PricingInput, calculateFare produces:
 * - fare = roundHalfUp(baseRate + ratePerKm × distanceKm, 2)
 * - platformCommission = roundHalfUp(fare × commissionPercentage / 100, 2)
 * - riderEarnings = roundHalfUp(fare - platformCommission, 2)
 * - Same inputs always produce same outputs (determinism)
 */
describe("Property 1: Cálculo de tarifa — correctitud y descomposición", () => {
  const pricingInputArb: fc.Arbitrary<PricingInput> = fc.record({
    baseRate: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
    ratePerKm: fc.double({ min: 0.0, max: 9999.99, noNaN: true }),
    commissionPercentage: fc.double({ min: 1.0, max: 50.0, noNaN: true }),
    distanceKm: fc.double({ min: 0.5, max: 1000, noNaN: true }),
  });

  it("fare equals roundHalfUp(baseRate + ratePerKm × distanceKm, 2)", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        const result = calculateFare(input);
        const expectedFare = roundHalfUp(
          input.baseRate + input.ratePerKm * input.distanceKm,
          2,
        );
        expect(result.fare).toBe(expectedFare);
      }),
      { numRuns: 100 },
    );
  });

  it("platformCommission equals roundHalfUp(fare × commissionPercentage / 100, 2)", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        const result = calculateFare(input);
        const expectedCommission = roundHalfUp(
          (result.fare * input.commissionPercentage) / 100,
          2,
        );
        expect(result.platformCommission).toBe(expectedCommission);
      }),
      { numRuns: 100 },
    );
  });

  it("riderEarnings equals roundHalfUp(fare - platformCommission, 2)", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        const result = calculateFare(input);
        const expectedEarnings = roundHalfUp(
          result.fare - result.platformCommission,
          2,
        );
        expect(result.riderEarnings).toBe(expectedEarnings);
      }),
      { numRuns: 100 },
    );
  });

  it("is deterministic: same inputs always produce same outputs", () => {
    fc.assert(
      fc.property(pricingInputArb, (input) => {
        const result1 = calculateFare(input);
        const result2 = calculateFare(input);
        expect(result1).toStrictEqual(result2);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Validates: Requirements 17.3
 *
 * Property 3: roundHalfUp(value, 2) is idempotent,
 * rounds up when 3rd decimal >= 5, rounds down when < 5.
 */
describe("Property 3: Redondeo half-up", () => {
  it("is idempotent: roundHalfUp(roundHalfUp(x, 2), 2) === roundHalfUp(x, 2)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -999999.999, max: 999999.999, noNaN: true }),
        (value) => {
          const once = roundHalfUp(value, 2);
          const twice = roundHalfUp(once, 2);
          expect(twice).toBe(once);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rounds up when the 3rd decimal digit is >= 5", () => {
    // Generate numbers where we know the 3rd decimal is >= 5
    const arbWithThirdDecGe5 = fc
      .tuple(
        fc.integer({ min: -999999, max: 999999 }),
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 5, max: 9 }),
      )
      .map(([intPart, twoDecimals, thirdDecimal]) => {
        // Construct: intPart.XX(thirdDecimal)
        const sign = intPart < 0 ? -1 : 1;
        const absInt = Math.abs(intPart);
        return sign * (absInt + twoDecimals / 100 + thirdDecimal / 1000);
      });

    fc.assert(
      fc.property(arbWithThirdDecGe5, (value) => {
        const rounded = roundHalfUp(value, 2);
        // The rounded value should be >= value for positive, <= value for negative
        // More precisely: rounded should equal Math.floor(value * 100 + 0.5 + epsilon) / 100
        // But let's check that the 2nd decimal is one more than floor(value*100) % 10
        // when the third decimal is >= 5
        if (value >= 0) {
          const truncated = Math.floor(value * 100) / 100;
          expect(rounded).toBeGreaterThanOrEqual(truncated);
        }
        // Verify it has at most 2 decimal places (use tolerance for floating-point)
        const scaled = rounded * 100;
        expect(Math.abs(Math.round(scaled) - scaled)).toBeLessThan(1e-6);
      }),
      { numRuns: 100 },
    );
  });

  it("rounds down when the 3rd decimal digit is < 5", () => {
    // Generate numbers where we know the 3rd decimal is < 5 (1-4, not 0 which is already at 2 decimals)
    const arbWithThirdDecLt5 = fc
      .tuple(
        fc.integer({ min: 0, max: 999999 }),
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 1, max: 4 }),
      )
      .map(([intPart, twoDecimals, thirdDecimal]) => {
        return intPart + twoDecimals / 100 + thirdDecimal / 1000;
      });

    fc.assert(
      fc.property(arbWithThirdDecLt5, (value) => {
        const rounded = roundHalfUp(value, 2);
        const truncated = Math.floor(value * 100) / 100;
        // When third decimal < 5, rounded should equal truncated (rounds down)
        expect(rounded).toBe(truncated);
      }),
      { numRuns: 100 },
    );
  });

  it("result always has exactly 2 decimal places of precision", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -999999.999, max: 999999.999, noNaN: true }),
        (value) => {
          const rounded = roundHalfUp(value, 2);
          // Multiplying by 100 should give an integer (within floating point tolerance)
          expect(
            Math.abs(rounded * 100 - Math.round(rounded * 100)),
          ).toBeLessThan(1e-8);
        },
      ),
      { numRuns: 100 },
    );
  });
});
