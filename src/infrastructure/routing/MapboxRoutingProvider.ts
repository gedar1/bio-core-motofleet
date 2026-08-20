import { createRequire } from "node:module";
import type {
  Coordinates,
  RouteEstimate,
  RoutingProvider,
} from "../../domains/errands/RoutingProvider.js";

const require = createRequire(import.meta.url);

type RoutingFailureReason =
  | "CONFIGURATION"
  | "TIMEOUT"
  | "UPSTREAM"
  | "INVALID_RESPONSE";

/** A safe, provider-agnostic error suitable for mapping to a 503 response. */
export class MapboxRoutingError extends Error {
  readonly code = "ROUTING_UNAVAILABLE";

  constructor(
    readonly reason: RoutingFailureReason,
    readonly upstreamStatus?: number,
  ) {
    super("Routing service is temporarily unavailable.");
    this.name = "MapboxRoutingError";
  }
}

interface MapboxRequest {
  send(): Promise<unknown>;
  abort(): void;
}

interface MapboxDirectionsService {
  getDirections(options: {
    profile: "driving-traffic";
    waypoints: ReadonlyArray<{
      coordinates: readonly [longitude: number, latitude: number];
    }>;
    alternatives: false;
    geometries: "geojson";
    overview: "full";
  }): MapboxRequest;
}

type MapboxDirectionsServiceFactory = (options: {
  accessToken: string;
}) => MapboxDirectionsService;

interface MapboxDirectionsResponse {
  readonly body?: {
    readonly routes?: ReadonlyArray<{
      readonly distance?: number;
      readonly duration?: number;
      readonly geometry?: {
        readonly type?: string;
        readonly coordinates?: ReadonlyArray<
          readonly [longitude: number, latitude: number]
        >;
      };
    }>;
  };
}

const createDirectionsService =
  require("@mapbox/mapbox-sdk/services/directions") as MapboxDirectionsServiceFactory;

/**
 * Infrastructure adapter for Mapbox Directions. It deliberately returns only
 * route metadata, keeping provider details and Mapbox credentials outside the
 * domain layer.
 */
export class MapboxRoutingProvider implements RoutingProvider {
  private readonly accessToken = process.env.MAPBOX_SECRET_TOKEN?.trim();

  constructor(private readonly timeoutMs = 5000) {}

  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<RouteEstimate> {
    if (!this.accessToken) {
      throw new MapboxRoutingError("CONFIGURATION");
    }

    const directions = createDirectionsService({
      accessToken: this.accessToken,
    });
    const request = directions.getDirections({
      profile: "driving-traffic",
      waypoints: [
        { coordinates: [origin.longitude, origin.latitude] },
        { coordinates: [destination.longitude, destination.latitude] },
      ],
      alternatives: false,
      geometries: "geojson",
      overview: "full",
    });

    const response = (await this.sendWithTimeout(
      request,
    )) as MapboxDirectionsResponse;
    const route = response.body?.routes?.[0];
    const distance = route?.distance;
    const duration = route?.duration;
    const geometry = route?.geometry;

    if (
      typeof distance !== "number" ||
      !Number.isFinite(distance) ||
      distance <= 0 ||
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      geometry?.type !== "LineString" ||
      !geometry.coordinates ||
      geometry.coordinates.length < 2
    ) {
      throw new MapboxRoutingError("INVALID_RESPONSE");
    }

    return {
      distanceKm: distance / 1000,
      durationMinutes: duration / 60,
      geometry: {
        type: "LineString",
        coordinates: geometry.coordinates,
      },
      provider: "mapbox",
      profile: "driving-traffic",
    };
  }

  private sendWithTimeout(request: MapboxRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        request.abort();
        reject(new MapboxRoutingError("TIMEOUT"));
      }, this.timeoutMs);

      request
        .send()
        .then(
          (response) => {
            if (settled) return;
            settled = true;
            resolve(response);
          },
          (error) => {
            if (settled) return;
            settled = true;
            reject(
              new MapboxRoutingError("UPSTREAM", this.getUpstreamStatus(error)),
            );
          },
        )
        .finally(() => clearTimeout(timeout));
    });
  }

  private getUpstreamStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") return undefined;

    const details = error as {
      status?: unknown;
      statusCode?: unknown;
      response?: { status?: unknown; statusCode?: unknown };
    };
    const candidates = [
      details.status,
      details.statusCode,
      details.response?.status,
      details.response?.statusCode,
    ];

    return candidates.find(
      (status): status is number =>
        typeof status === "number" && Number.isInteger(status),
    );
  }
}
