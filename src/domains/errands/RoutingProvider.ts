export type RoutingProviderName = "mapbox";
export type RoutingProfile = "driving-traffic";

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface RouteGeometry {
  readonly type: "LineString";
  readonly coordinates: ReadonlyArray<
    readonly [longitude: number, latitude: number]
  >;
}

export interface RouteEstimate {
  readonly distanceKm: number;
  readonly durationMinutes: number;
  readonly geometry: RouteGeometry;
  readonly provider: RoutingProviderName;
  readonly profile: RoutingProfile;
}

/**
 * Port for route providers. Domain logic depends on this contract rather than
 * any vendor SDK or HTTP API, so a future provider can be added without
 * changing errand pricing workflows.
 */
export interface RoutingProvider {
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<RouteEstimate>;
}
