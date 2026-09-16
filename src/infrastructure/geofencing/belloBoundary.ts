import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface GeographicCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

type Position = readonly [longitude: number, latitude: number];
type LinearRing = readonly Position[];
type PolygonCoordinates = readonly LinearRing[];
type MultiPolygonCoordinates = readonly PolygonCoordinates[];

type BelloBoundaryFeatureCollection = {
  readonly type: "FeatureCollection";
  readonly features: ReadonlyArray<{
    readonly geometry?: {
      readonly type?: string;
      readonly coordinates?: MultiPolygonCoordinates;
    };
  }>;
};

const BELLO_BOUNDARY_PATH = resolve(
  process.cwd(),
  "data/geospatial/bello-antioquia-mgn2025.geojson",
);
const BOUNDARY_TOLERANCE = 1e-12;

const boundarySource = JSON.parse(
  readFileSync(BELLO_BOUNDARY_PATH, "utf8"),
) as BelloBoundaryFeatureCollection;
const belloGeometry = boundarySource.features[0]?.geometry;

if (
  boundarySource.type !== "FeatureCollection" ||
  belloGeometry?.type !== "MultiPolygon" ||
  !Array.isArray(belloGeometry.coordinates)
) {
  throw new Error(
    "Bello municipal boundary is missing or has an invalid MultiPolygon geometry.",
  );
}

const BELLO_MULTI_POLYGON = belloGeometry.coordinates;

const isPointOnSegment = (
  longitude: number,
  latitude: number,
  start: Position,
  end: Position,
): boolean => {
  const [startLongitude, startLatitude] = start;
  const [endLongitude, endLatitude] = end;
  const longitudeDelta = endLongitude - startLongitude;
  const latitudeDelta = endLatitude - startLatitude;
  const squaredLength = longitudeDelta ** 2 + latitudeDelta ** 2;

  // MGN geometries may include repeated consecutive vertices. A zero-length
  // segment contains only that single vertex, never every point in the plane.
  if (squaredLength <= BOUNDARY_TOLERANCE ** 2) {
    return (
      Math.abs(longitude - startLongitude) <= BOUNDARY_TOLERANCE &&
      Math.abs(latitude - startLatitude) <= BOUNDARY_TOLERANCE
    );
  }

  const crossProduct =
    (longitude - startLongitude) * latitudeDelta -
    (latitude - startLatitude) * longitudeDelta;

  if (Math.abs(crossProduct) > BOUNDARY_TOLERANCE) return false;

  const dotProduct =
    (longitude - startLongitude) * longitudeDelta +
    (latitude - startLatitude) * latitudeDelta;
  if (dotProduct < -BOUNDARY_TOLERANCE) return false;

  return dotProduct <= squaredLength + BOUNDARY_TOLERANCE;
};

/** Returns true for a point inside a ring or exactly on its boundary. */
const isPointInRing = (
  longitude: number,
  latitude: number,
  ring: LinearRing,
): boolean => {
  let inside = false;

  for (
    let current = 0, previous = ring.length - 1;
    current < ring.length;
    previous = current++
  ) {
    const currentPoint = ring[current];
    const previousPoint = ring[previous];
    if (!currentPoint || !previousPoint) continue;

    if (isPointOnSegment(longitude, latitude, previousPoint, currentPoint)) {
      return true;
    }

    const [currentLongitude, currentLatitude] = currentPoint;
    const [previousLongitude, previousLatitude] = previousPoint;
    const crossesLatitude =
      currentLatitude > latitude !== previousLatitude > latitude;
    const intersectionLongitude =
      ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude) +
      currentLongitude;

    if (crossesLatitude && longitude < intersectionLongitude) inside = !inside;
  }

  return inside;
};

const isPointInPolygon = (
  longitude: number,
  latitude: number,
  polygon: PolygonCoordinates,
): boolean => {
  const [outerRing, ...holes] = polygon;
  if (!outerRing || !isPointInRing(longitude, latitude, outerRing)) {
    return false;
  }

  return !holes.some((hole) => isPointInRing(longitude, latitude, hole));
};

/**
 * Determines municipal coverage using the DANE MGN 2025 boundary.
 * Points lying directly on the municipality boundary are treated as Bello.
 */
export const isPointInsideBello = ({
  latitude,
  longitude,
}: GeographicCoordinates): boolean => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

  return BELLO_MULTI_POLYGON.some((polygon) =>
    isPointInPolygon(longitude, latitude, polygon),
  );
};
