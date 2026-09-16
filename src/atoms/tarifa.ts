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
  /** Optional operational floor, used for services that leave the local zone. */
  minimumFareCop?: number;
}

export interface FlatFareInput {
  fareCop: number;
  commissionBasisPoints: number;
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

function assertCommissionBasisPoints(commissionBasisPoints: number): void {
  assertSafeInteger(commissionBasisPoints, "commissionBasisPoints");
  if (commissionBasisPoints < 100 || commissionBasisPoints > 5_000) {
    throw new RangeError("commissionBasisPoints must be between 100 and 5,000");
  }
}

function distributeFare(
  fareCop: number,
  commissionBasisPoints: number,
): PricingResult {
  assertSafeInteger(fareCop, "fareCop");
  if (fareCop < 1)
    throw new RangeError("fareCop must be a positive COP amount");
  assertCommissionBasisPoints(commissionBasisPoints);

  const platformCommissionCop = roundHalfUp(
    (fareCop * commissionBasisPoints) / 10_000,
  );
  const riderEarningsCop = fareCop - platformCommissionCop;
  assertSafeInteger(platformCommissionCop, "platformCommissionCop");
  assertSafeInteger(riderEarningsCop, "riderEarningsCop");

  return { fareCop, platformCommissionCop, riderEarningsCop };
}

/** Calculates a fixed COP fare and distributes its commission once. */
export function calculateFlatFare(input: FlatFareInput): PricingResult {
  return distributeFare(input.fareCop, input.commissionBasisPoints);
}

/**
 * Calculates an integer COP fare. The variable route component is rounded once,
 * an optional floor is applied, then commission is rounded once.
 */
export function calculateFare(input: PricingInput): PricingResult {
  const {
    baseRateCop,
    ratePerKmCop,
    commissionBasisPoints,
    distanceKm,
    minimumFareCop,
  } = input;

  assertSafeInteger(baseRateCop, "baseRateCop");
  assertSafeInteger(ratePerKmCop, "ratePerKmCop");
  if (baseRateCop < 1 || ratePerKmCop < 0) {
    throw new RangeError(
      "COP rates must be non-negative, with a positive base rate",
    );
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError("distanceKm must be a non-negative finite number");
  }
  if (minimumFareCop !== undefined) {
    assertSafeInteger(minimumFareCop, "minimumFareCop");
    if (minimumFareCop < 1) {
      throw new RangeError("minimumFareCop must be a positive COP amount");
    }
  }

  const effectiveDistanceKm = Math.max(0.5, distanceKm);
  const variableFareCop = roundHalfUp(ratePerKmCop * effectiveDistanceKm);
  const routeFareCop = baseRateCop + variableFareCop;
  const fareCop = Math.max(routeFareCop, minimumFareCop ?? 0);

  return distributeFare(fareCop, commissionBasisPoints);
}
