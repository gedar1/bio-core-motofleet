/**
 * Fare calculation: platform commission and rider earnings.
 *
 * Invariants:
 * - fare = platformCommission + riderEarnings (±0.01 for rounding)
 * - Deterministic: same inputs → same result always
 * - Half-up rounding: if the 3rd decimal ≥ 5, rounds up
 */

export interface PricingInput {
  /** Base rate in local currency (0.01–999,999.99) */
  baseRate: number;
  /** Rate per kilometer (0.00–9,999.99) */
  ratePerKm: number;
  /** Platform commission percentage (1.00–50.00) */
  commissionPercentage: number;
  /** Estimated distance in kilometers (≥ 0.5) */
  distanceKm: number;
}

export interface PricingResult {
  /** Total fare calculated, rounded to 2 decimals (half-up) */
  fare: number;
  /** Platform commission, rounded to 2 decimals (half-up) */
  platformCommission: number;
  /** Rider net earnings, rounded to 2 decimals (half-up) */
  riderEarnings: number;
}

/**
 * Rounds a number to N decimals using half-up strategy.
 *
 * Does NOT use Math.round() directly (banker's rounding in certain cases).
 * Implements: multiply by 10^decimals, add epsilon correction, floor, divide.
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Number rounded with exactly `decimals` decimal places of precision
 */
export function roundHalfUp(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  // Multiply, add a small epsilon to handle floating point edge cases
  // where e.g. 2.675 * 100 = 267.49999999... instead of 267.5
  // The epsilon ensures values at the .5 boundary round up correctly.
  const shifted = value * factor + 1e-10;
  return Math.floor(shifted + 0.5) / factor;
}

/**
 * Calculates fare, commission, and rider earnings.
 *
 * Formulas:
 * - fare = roundHalfUp(baseRate + ratePerKm × distanceKm, 2)
 * - platformCommission = roundHalfUp(fare × commissionPercentage / 100, 2)
 * - riderEarnings = roundHalfUp(fare - platformCommission, 2)
 *
 * @param input - Input data for the calculation
 * @returns Result with fare, commission and earnings
 */
export function calculateFare(input: PricingInput): PricingResult {
  const { baseRate, ratePerKm, commissionPercentage, distanceKm } = input;

  const fare = roundHalfUp(baseRate + ratePerKm * distanceKm, 2);
  const platformCommission = roundHalfUp(
    (fare * commissionPercentage) / 100,
    2,
  );
  const riderEarnings = roundHalfUp(fare - platformCommission, 2);

  return { fare, platformCommission, riderEarnings };
}
