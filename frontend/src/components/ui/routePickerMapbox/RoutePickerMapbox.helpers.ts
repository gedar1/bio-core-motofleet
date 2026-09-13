import type {
  PointKind,
  RouteAddressResolution,
  RouteLocation,
  RouteValue,
  SearchBoxRetrieveFeature,
} from "./RoutePickerMapbox.types";

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
export const isPlaceholderAddress = (
  kind: PointKind,
  address: string,
): boolean =>
  address === MAP_SELECTION_FALLBACK_ADDRESS[kind] ||
  address === CURRENT_LOCATION_ADDRESS;

const normalizeAddress = (address: string): string =>
  address
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:cra|cr|kra|k)\.?\s*/g, "carrera ")
    .replace(/\b(?:cl|calle)\.?\s*/g, "calle ")
    .replace(/\b(?:av|avda|avenida)\.?\s*/g, "avenida ")
    .replace(/\s+/g, " ")
    .trim();

const STREET_PATTERN =
  /\b(carrera|calle|avenida|diagonal|transversal)\s*(\d+[a-z]?(?:\s*[a-z])?)/i;
const HOUSE_NUMBER_PATTERN =
  /#\s*([0-9]+[a-z]?(?:\s*[a-z])?\s*-\s*[0-9]+[a-z]?)/i;

/** Extracts a normalized Colombian street type-and-number segment when present. */
export const extractStreetReference = (address: string): string | null => {
  const match = STREET_PATTERN.exec(normalizeAddress(address));
  return match ? `${match[1]} ${match[2].replace(/\s+/g, "")}` : null;
};

/** Extracts a normalized Colombian # block-door-number segment when present. */
export const extractHouseNumber = (address: string): string | null => {
  const match = HOUSE_NUMBER_PATTERN.exec(address);
  return match ? match[1].replace(/\s+/g, "").toLowerCase() : null;
};

/** Classifies a written reference against the exact pin's resolved address. */
export const classifyAddressResolution = (
  kind: PointKind,
  location: Pick<
    RouteLocation,
    "inputAddress" | "resolvedAddress" | "referenceKind"
  >,
): RouteAddressResolution => {
  const { inputAddress, resolvedAddress, referenceKind = "address" } = location;

  if (!resolvedAddress) {
    return isPlaceholderAddress(kind, inputAddress) ? "pin_only" : "unresolved";
  }

  if (referenceKind === "poi") return "poi";
  if (isPlaceholderAddress(kind, inputAddress)) return "pin_only";
  if (normalizeAddress(inputAddress) === normalizeAddress(resolvedAddress)) {
    return "exact";
  }

  const inputStreet = extractStreetReference(inputAddress);
  const resolvedStreet = extractStreetReference(resolvedAddress);
  const inputHouseNumber = extractHouseNumber(inputAddress);
  const resolvedHouseNumber = extractHouseNumber(resolvedAddress);

  // Mapbox commonly appends city/context to an otherwise identical address.
  if (
    inputStreet &&
    resolvedStreet &&
    inputStreet === resolvedStreet &&
    inputHouseNumber &&
    resolvedHouseNumber &&
    inputHouseNumber === resolvedHouseNumber
  ) {
    return "exact";
  }

  if (
    (inputStreet && resolvedStreet && inputStreet !== resolvedStreet) ||
    (inputHouseNumber &&
      resolvedHouseNumber &&
      inputHouseNumber !== resolvedHouseNumber)
  ) {
    return "significant";
  }

  return "minor";
};

/** Returns the current classification, including the temporary reverse-geocode state. */
export const getAddressResolution = (
  kind: PointKind,
  location: RouteLocation,
): RouteAddressResolution =>
  location.addressResolution ?? classifyAddressResolution(kind, location);

export const isAddressResolutionPending = (
  kind: PointKind,
  location: RouteLocation,
): boolean => getAddressResolution(kind, location) === "pending";

/**
 * Uses the pin's resolved address when the user intentionally placed it at a
 * materially different street/number. The written reference remains in
 * inputAddress for audit and rider context.
 */
export const resolveDisplayAddress = (
  kind: PointKind,
  location: RouteLocation,
): string => {
  const resolution = getAddressResolution(kind, location);

  if (resolution === "significant" || resolution === "pin_only") {
    return location.resolvedAddress ?? location.inputAddress;
  }

  return location.inputAddress || location.resolvedAddress || location.address;
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
