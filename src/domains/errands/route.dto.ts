import type {
  Coordinates,
  RouteGeometry,
  RoutingProfile,
  RoutingProviderName,
} from "./RoutingProvider.js";

export interface RouteEstimateRequest {
  readonly origin: Coordinates;
  readonly destination: Coordinates;
}

/** Safe response DTO for route previews. It contains no pricing information. */
export interface RouteEstimateResponse {
  readonly distanceKm: number;
  readonly durationMinutes: number;
  readonly geometry: RouteGeometry;
  readonly provider: RoutingProviderName;
  readonly profile: RoutingProfile;
}
