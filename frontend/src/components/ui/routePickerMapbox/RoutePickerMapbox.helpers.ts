import type { PointKind, RouteLocation, RouteValue, SearchBoxRetrieveFeature } from "./RoutePickerMapbox.types";

export type { PointKind } from "./RoutePickerMapbox.types";
export type RoutePickerLocation = RouteLocation;
export type RoutePickerValue = RouteValue;

export type Stage = "capture-origin" | "capture-destination" | "map";

/**
 * Determines capture visibility exclusively from whether the route endpoints
 * have been selected. Pin confirmation is intentionally not part of this flow.
 */
export const getStage = (value: RouteValue): Stage => {
  if (!value.origin) return "capture-origin";
  if (!value.destination) return "capture-destination";
  return "map";
};

export const shouldShowDestinationSearch = (value: RouteValue): boolean =>
  getStage(value) !== "capture-origin";

export const shouldShowMap = (value: RouteValue): boolean =>
  getStage(value) === "map";

export type OverlayMode = "confirm" | "edit";

export const getOverlayMode = (
  kind: PointKind,
  value: RouteValue,
): OverlayMode => (value[kind]?.confirmed ? "edit" : "confirm");

/** Placeholder text used when a point is chosen by tapping the map/marker instead of typing. */
export const MAP_SELECTION_FALLBACK_ADDRESS: Record<PointKind, string> = {
  origin: "Punto de recogida seleccionado",
  destination: "Punto de entrega seleccionado",
};
export const CURRENT_LOCATION_ADDRESS = "Ubicación actual";

/** True when the address text wasn't typed by the user (map tap or GPS). */
export const isPlaceholderAddress = (kind: PointKind, address: string): boolean =>
  address === MAP_SELECTION_FALLBACK_ADDRESS[kind] ||
  address === CURRENT_LOCATION_ADDRESS;

/** Keeps the existing typed-address versus resolved-address comparison intact. */
export const hasAddressDiscrepancy = (location: RouteLocation): boolean =>
  location.resolvedAddress !== null &&
  location.inputAddress.trim().toLowerCase() !==
    location.resolvedAddress.trim().toLowerCase();

/**
 * Applies the single source-of-truth rule used at confirmation and in previews:
 * typed address first; resolved address only for map/GPS placeholder text.
 */
export const resolveDisplayAddress = (
  kind: PointKind,
  location: RouteLocation,
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
  location: RouteLocation,
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
  value: RouteValue,
  activeOverlayKind: PointKind | null,
): boolean => {
  const location = value[kind];
  return !!location && !location.confirmed && activeOverlayKind !== kind;
};

/** Shows the lower-urgency confirmed-pin edit hint unless its overlay is open. */
export const isEditHintVisible = (
  kind: PointKind,
  value: RouteValue,
  activeOverlayKind: PointKind | null,
): boolean => {
  const location = value[kind];
  return !!location && location.confirmed && activeOverlayKind !== kind;
};

export const hasSeparateRoutablePoint = (location: RouteLocation): boolean =>
  location.routableLatitude !== undefined &&
  location.routableLongitude !== undefined &&
  (location.routableLatitude !== location.latitude ||
    location.routableLongitude !== location.longitude);

const COLOMBIAN_ADDRESS_CONTEXT_PATTERN =
  /colombia|medell[ií]n|bogot[aá]|cali|barranquilla|cartagena|pereira|manizales|bucaramanga/i;

export const normalizeColombianAddressQuery = (query: string): string => {
  const normalized = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(?:cra|cr|kra|k)\.?\s*/gi, "Carrera ")
    .replace(/\b(?:cl|calle)\.?\s*/gi, "Calle ")
    .replace(/\b(?:av|avda|avenida)\.?\s*/gi, "Avenida ")
    .replace(/\s*#\s*/g, " # ")
    .replace(/\s*-\s*/g, "-");

  if (!normalized || COLOMBIAN_ADDRESS_CONTEXT_PATTERN.test(normalized)) {
    return normalized;
  }

  return `${normalized}, Colombia`;
};

/** Preserves POI names because SearchBox does not include them in full_address. */
export const getSelectedSearchBoxLabel = (
  feature: SearchBoxRetrieveFeature,
): string => {
  const { feature_type, full_address, name, name_preferred } =
    feature.properties;

  return feature_type === "poi"
    ? `${name_preferred || name}, ${full_address}`
    : full_address;
};

export const getPointLabel = (kind: PointKind): string =>
  kind === "origin" ? "recogida" : "entrega";
