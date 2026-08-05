// Feature: motofleet-mvp, Property 2: Distancia Haversine — correctitud y mínimo

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { haversineDistance } from "../../src/atoms/haversine.js";

/**
 * Validates: Requirements 17.1, 17.5
 *
 * Property 2: For valid coordinates (lat ∈ [-90, 90], lng ∈ [-180, 180]):
 * - Result ≥ 0.5 km always
 * - Same point → 0.5
 * - Symmetric: haversine(A, B) === haversine(B, A)
 * - Triangle inequality (with tolerance): haversine(A, C) ≤ haversine(A, B) + haversine(B, C) + 0.01
 */
describe("Property 2: Distancia Haversine — correctitud y mínimo", () => {
  const coordArb = fc.record({
    lat: fc.double({ min: -90, max: 90, noNaN: true }),
    lng: fc.double({ min: -180, max: 180, noNaN: true }),
  });

  it("result is always >= 0.5 km", () => {
    fc.assert(
      fc.property(coordArb, coordArb, (origin, destination) => {
        const distance = haversineDistance(origin, destination);
        expect(distance).toBeGreaterThanOrEqual(0.5);
      }),
      { numRuns: 100 },
    );
  });

  it("same point returns 0.5 (minimum floor)", () => {
    fc.assert(
      fc.property(coordArb, (point) => {
        const distance = haversineDistance(point, point);
        expect(distance).toBe(0.5);
      }),
      { numRuns: 100 },
    );
  });

  it("is symmetric: haversine(A, B) === haversine(B, A)", () => {
    fc.assert(
      fc.property(coordArb, coordArb, (a, b) => {
        const ab = haversineDistance(a, b);
        const ba = haversineDistance(b, a);
        expect(ab).toBe(ba);
      }),
      { numRuns: 100 },
    );
  });

  it("satisfies triangle inequality: haversine(A, C) ≤ haversine(A, B) + haversine(B, C) + 0.01", () => {
    fc.assert(
      fc.property(coordArb, coordArb, coordArb, (a, b, c) => {
        const ac = haversineDistance(a, c);
        const ab = haversineDistance(a, b);
        const bc = haversineDistance(b, c);
        // Triangle inequality with floating point tolerance
        expect(ac).toBeLessThanOrEqual(ab + bc + 0.01);
      }),
      { numRuns: 100 },
    );
  });
});
