/**
 * Canonical COP fare calculation.
 *
 * All monetary values are safe integers in Colombian pesos. Commission is
 * represented in basis points, so 1% is 100 bps and 50% is 5,000 bps.
 */
export interface PricingInput {
  baseRateCop: number;
  ratePerKmCop: number;
  commissionBasisPoints: number;
  distanceKm: number;
}

export interface PricingResult {
  fareCop: number;
  platformCommissionCop: number;
  riderEarningsCop: number;
}

/** Rounds a non-negative value to the nearest integer, with .5 values up. */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("Value must be a non-negative finite number");
  }

  const precisionCorrection = Number.EPSILON * Math.max(1, Math.abs(value));
  return Math.floor(value + 0.5 + precisionCorrection);
}

function assertSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`);
  }
}

/**
 * Calculates an integer COP fare. The variable route component is rounded once,
 * then commission is rounded once; rider earnings are the exact remainder.
 */
export function calculateFare(input: PricingInput): PricingResult {
  const { baseRateCop, ratePerKmCop, commissionBasisPoints, distanceKm } =
    input;

  assertSafeInteger(baseRateCop, "baseRateCop");
  assertSafeInteger(ratePerKmCop, "ratePerKmCop");
  assertSafeInteger(commissionBasisPoints, "commissionBasisPoints");

  if (baseRateCop < 1 || ratePerKmCop < 0) {
    throw new RangeError(
      "COP rates must be non-negative, with a positive base rate",
    );
  }
  if (commissionBasisPoints < 100 || commissionBasisPoints > 5_000) {
    throw new RangeError("commissionBasisPoints must be between 100 and 5,000");
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError("distanceKm must be a non-negative finite number");
  }

  const effectiveDistanceKm = Math.max(0.5, distanceKm);
  const variableFareCop = roundHalfUp(ratePerKmCop * effectiveDistanceKm);
  const fareCop = baseRateCop + variableFareCop;
  assertSafeInteger(fareCop, "fareCop");

  const platformCommissionCop = roundHalfUp(
    (fareCop * commissionBasisPoints) / 10_000,
  );
  const riderEarningsCop = fareCop - platformCommissionCop;
  assertSafeInteger(platformCommissionCop, "platformCommissionCop");
  assertSafeInteger(riderEarningsCop, "riderEarningsCop");

  return { fareCop, platformCommissionCop, riderEarningsCop };
}
