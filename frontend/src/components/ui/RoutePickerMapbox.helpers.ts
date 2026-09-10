export type PointKind = "origin" | "destination";

/** Address and pin data for one route endpoint. */
export interface RoutePickerLocation {
  readonly address: string;
  readonly inputAddress: string;
  readonly resolvedAddress: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly routableLatitude?: number;
  readonly routableLongitude?: number;
  readonly instructions?: string;
  readonly confirmed: boolean;
}

export interface RoutePickerValue {
  readonly origin: RoutePickerLocation | null;
  readonly destination: RoutePickerLocation | null;
}

export type Stage = "capture-origin" | "capture-destination" | "map";

/**
 * Determines capture visibility exclusively from whether the route endpoints
 * have been selected. Pin confirmation is intentionally not part of this flow.
 */
export const getStage = (value: RoutePickerValue): Stage => {
  if (!value.origin) return "capture-origin";
  if (!value.destination) return "capture-destination";
  return "map";
};

export const shouldShowDestinationSearch = (value: RoutePickerValue): boolean =>
  getStage(value) !== "capture-origin";

export const shouldShowMap = (value: RoutePickerValue): boolean =>
  getStage(value) === "map";

export type OverlayMode = "confirm" | "edit";

export const getOverlayMode = (
  kind: PointKind,
  value: RoutePickerValue,
): OverlayMode => (value[kind]?.confirmed ? "edit" : "confirm");

const MAP_SELECTION_FALLBACK_ADDRESS: Record<PointKind, string> = {
  origin: "Punto de recogida seleccionado",
  destination: "Punto de entrega seleccionado",
};
const CURRENT_LOCATION_ADDRESS = "Ubicación actual";

/** True when the address text wasn't typed by the user (map tap or GPS). */
export const isPlaceholderAddress = (kind: PointKind, address: string): boolean =>
  address === MAP_SELECTION_FALLBACK_ADDRESS[kind] ||
  address === CURRENT_LOCATION_ADDRESS;

/** Keeps the existing typed-address versus resolved-address comparison intact. */
export const hasAddressDiscrepancy = (
  location: RoutePickerLocation,
): boolean =>
  location.resolvedAddress !== null &&
  location.inputAddress.trim().toLowerCase() !==
    location.resolvedAddress.trim().toLowerCase();

/**
 * Applies the single source-of-truth rule used at confirmation and in previews:
 * typed address first; resolved address only for map/GPS placeholder text.
 */
export const resolveDisplayAddress = (
  kind: PointKind,
  location: RoutePickerLocation,
): string =>
  isPlaceholderAddress(kind, location.inputAddress)
    ? (location.resolvedAddress ?? location.inputAddress)
    : location.inputAddress;

export type DiscrepancySeverity =
  | "none"
  | "minor"
  | "house_number_mismatch";

const HOUSE_NUMBER_PATTERN =
  /#\s*([0-9]+[a-z]?(?:\s*[a-z])?\s*-\s*[0-9]+[a-z]?)/i;

/** Extracts a normalized Colombian # block-door-number segment when present. */
export const extractHouseNumber = (address: string): string | null => {
  const match = HOUSE_NUMBER_PATTERN.exec(address);
  return match ? match[1].replace(/\s+/g, "").toLowerCase() : null;
};

/**
 * Retains the existing discrepancy detector as its gate, escalating only when
 * both typed and resolved addresses contain different house/door numbers.
 */
export const getDiscrepancySeverity = (
  location: RoutePickerLocation,
): DiscrepancySeverity => {
  if (!hasAddressDiscrepancy(location)) return "none";

  const typedNumber = extractHouseNumber(location.inputAddress);
  const resolvedNumber = location.resolvedAddress
    ? extractHouseNumber(location.resolvedAddress)
    : null;

  return typedNumber && resolvedNumber && typedNumber !== resolvedNumber
    ? "house_number_mismatch"
    : "minor";
};

/** Shows the required pending-pin confirmation affordance unless its overlay is open. */
export const isAffordanceVisible = (
  kind: PointKind,
  value: RoutePickerValue,
  activeOverlayKind: PointKind | null,
): boolean => {
  const location = value[kind];
  return !!location && !location.confirmed && activeOverlayKind !== kind;
};

/** Shows the lower-urgency confirmed-pin edit hint unless its overlay is open. */
export const isEditHintVisible = (
  kind: PointKind,
  value: RoutePickerValue,
  activeOverlayKind: PointKind | null,
): boolean => {
  const location = value[kind];
  return !!location && location.confirmed && activeOverlayKind !== kind;
};
