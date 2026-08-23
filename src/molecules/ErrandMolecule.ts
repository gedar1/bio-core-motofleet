import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule, PaginatedResult, Role } from "./IMolecule.js";
import { isValidErrandTransition } from "../atoms/stateMachines.js";
import type { ErrandState } from "../atoms/stateMachines.js";
import { calculateFare } from "../atoms/tarifa.js";
import {
  BusinessRuleViolation,
  ConflictError,
  ForbiddenError,
  InvalidStateTransition,
  NotFoundError,
  ValidationError,
} from "../domains/errors.js";
import type { RoutingProvider } from "../domains/errands/RoutingProvider.js";

export type ErrandType = "object_transport" | "purchase" | "errand";

export interface CreateErrandInput {
  type: ErrandType;
  description: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  quote_id: string;
  payment_method: "cash" | "transfer";
}

export interface QuoteErrandInput {
  type: ErrandType;
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
}

export type ErrandQuote = Awaited<ReturnType<RoutingProvider["getRoute"]>> & {
  quoteId: string;
  currency: "COP";
  fareCop: number;
  platformCommissionCop: number;
  riderEarningsCop: number;
  expiresAt: string;
};

export interface Errand {
  id: string;
  user_id: string;
  rider_id: string | null;
  type: ErrandType;
  description: string;
  origin_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lng: number | null;
  estimated_distance: number | null;
  fare: number;
  platform_commission: number;
  rider_earnings: number;
  fare_cop: number | null;
  platform_commission_cop: number | null;
  rider_earnings_cop: number | null;
  status: ErrandState;
  payment_method: string;
  cancellation_reason: string | null;
  requested_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ErrandFilters {
  status?: ErrandState;
}

/**
 * Molecule responsible for errand lifecycle management.
 * Handles creation, acceptance, state transitions, cancellation, and listing.
 */
export class ErrandMolecule implements IMolecule {
  readonly name = "errands";
  readonly version = "1.0.0";
  readonly description =
    "Errand lifecycle: creation, acceptance, state transitions, and listing.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
    private readonly routingProvider?: RoutingProvider,
    private readonly allowHaversineFallback = false,
  ) {}

  async create(userId: string, data: CreateErrandInput): Promise<Errand> {
    const user = this.db
      .prepare("SELECT id, status FROM users WHERE id = ?")
      .get(userId) as { id: string; status: string } | undefined;

    if (!user) throw new NotFoundError("User", userId);
    if (user.status !== "active") {
      throw new BusinessRuleViolation("User account is not active");
    }
    if (data.description.length < 10 || data.description.length > 500) {
      throw new ValidationError(
        "Description must be between 10 and 500 characters",
      );
    }
    if (!data.origin_address.trim() || !data.destination_address.trim()) {
      throw new ValidationError(
        "Origin and destination addresses are required",
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const createFromQuote = this.db.transaction(() => {
      const quote = this.db
        .prepare(
          `SELECT * FROM errand_quotes
           WHERE id = ? AND user_id = ?`,
        )
        .get(data.quote_id, userId) as
        | {
            errand_type: ErrandType;
            origin_lat: number;
            origin_lng: number;
            destination_lat: number;
            destination_lng: number;
            estimated_distance_km: number;
            estimated_duration_minutes: number;
            routing_provider: string;
            routing_profile: string;
            fare_cop: number;
            platform_commission_cop: number;
            rider_earnings_cop: number;
            expires_at: string;
            consumed_at: string | null;
          }
        | undefined;

      if (!quote) {
        throw new ConflictError("Quote is not available");
      }
      if (quote.consumed_at) {
        throw new ConflictError("Quote has already been used");
      }
      if (new Date(quote.expires_at).getTime() <= Date.now()) {
        throw new ConflictError("Quote has expired");
      }
      if (
        quote.errand_type !== data.type ||
        quote.origin_lat !== data.origin_lat ||
        quote.origin_lng !== data.origin_lng ||
        quote.destination_lat !== data.destination_lat ||
        quote.destination_lng !== data.destination_lng
      ) {
        throw new ConflictError(
          "Quote does not match the selected route or errand type",
        );
      }

      const consumed = this.db
        .prepare(
          "UPDATE errand_quotes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
        )
        .run(now, data.quote_id);
      if (consumed.changes !== 1) {
        throw new ConflictError("Quote has already been used");
      }

      this.db
        .prepare(
          `INSERT INTO errands (id, user_id, rider_id, type, description, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, estimated_distance, estimated_distance_km, estimated_duration_minutes, routing_provider, routing_profile, route_calculated_at, fare, platform_commission, rider_earnings, fare_cop, platform_commission_cop, rider_earnings_cop, status, payment_method, requested_at, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?)`,
        )
        .run(
          id,
          userId,
          data.type,
          data.description,
          data.origin_address,
          data.origin_lat,
          data.origin_lng,
          data.destination_address,
          data.destination_lat,
          data.destination_lng,
          quote.estimated_distance_km,
          quote.estimated_distance_km,
          quote.estimated_duration_minutes,
          quote.routing_provider,
          quote.routing_profile,
          now,
          quote.fare_cop,
          quote.platform_commission_cop,
          quote.rider_earnings_cop,
          quote.fare_cop,
          quote.platform_commission_cop,
          quote.rider_earnings_cop,
          data.payment_method,
          now,
          now,
          now,
        );
    });

    createFromQuote();
    this.logger.info("Errand created from approved quote", {
      errandId: id,
      userId,
      quoteId: data.quote_id,
      type: data.type,
    });
    return this.getById(id) as Errand;
  }

  async quote(userId: string, data: QuoteErrandInput): Promise<ErrandQuote> {
    const user = this.db
      .prepare("SELECT id, status FROM users WHERE id = ?")
      .get(userId) as { id: string; status: string } | undefined;
    if (!user) throw new NotFoundError("User", userId);
    if (user.status !== "active") {
      throw new BusinessRuleViolation("User account is not active");
    }

    const pricingRule = this.db
      .prepare(
        "SELECT base_rate, rate_per_km, commission_percentage FROM pricing_rules WHERE errand_type = ? AND active = 1",
      )
      .get(data.type) as
      | {
          base_rate: number;
          rate_per_km: number;
          commission_percentage: number;
        }
      | undefined;
    if (!pricingRule) {
      throw new BusinessRuleViolation(
        "No pricing configured for this errand type",
      );
    }

    const route = await this.estimateRoute(data.origin, data.destination);
    const distanceKm = Math.max(0.5, route.distanceKm);
    const pricing = calculateFare({
      baseRateCop: pricingRule.base_rate,
      ratePerKmCop: pricingRule.rate_per_km,
      commissionBasisPoints: pricingRule.commission_percentage * 100,
      distanceKm,
    });
    const quoteId = uuidv4();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    this.db
      .prepare(
        `INSERT INTO errand_quotes (id, user_id, errand_type, origin_lat, origin_lng, destination_lat, destination_lng, estimated_distance_km, estimated_duration_minutes, routing_provider, routing_profile, fare_cop, platform_commission_cop, rider_earnings_cop, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        quoteId,
        userId,
        data.type,
        data.origin.latitude,
        data.origin.longitude,
        data.destination.latitude,
        data.destination.longitude,
        distanceKm,
        route.durationMinutes,
        route.provider,
        route.profile,
        pricing.fareCop,
        pricing.platformCommissionCop,
        pricing.riderEarningsCop,
        expiresAt,
        createdAt,
      );

    return {
      ...route,
      distanceKm,
      quoteId,
      currency: "COP",
      fareCop: pricing.fareCop,
      platformCommissionCop: pricing.platformCommissionCop,
      riderEarningsCop: pricing.riderEarningsCop,
      expiresAt,
    };
  }

  async estimateRoute(
    origin: Parameters<RoutingProvider["getRoute"]>[0],
    destination: Parameters<RoutingProvider["getRoute"]>[1],
  ): ReturnType<RoutingProvider["getRoute"]> {
    if (!this.routingProvider) {
      throw new BusinessRuleViolation(
        "Routing service is temporarily unavailable",
      );
    }

    try {
      return await this.routingProvider.getRoute(origin, destination);
    } catch (error) {
      const routingError =
        error && typeof error === "object"
          ? (error as {
              reason?: unknown;
              upstreamStatus?: unknown;
              upstreamCode?: unknown;
            })
          : undefined;
      const reason =
        typeof routingError?.reason === "string"
          ? routingError.reason
          : "UNKNOWN";
      const upstreamStatus =
        typeof routingError?.upstreamStatus === "number"
          ? routingError.upstreamStatus
          : undefined;
      const upstreamCode =
        typeof routingError?.upstreamCode === "string"
          ? routingError.upstreamCode
          : undefined;

      this.logger.warn("Route estimate unavailable", {
        reason,
        ...(upstreamStatus ? { upstreamStatus } : {}),
        ...(upstreamCode ? { upstreamCode } : {}),
      });
      throw new BusinessRuleViolation(
        "Routing service is temporarily unavailable",
      );
    }
  }

  accept(errandId: string, riderId: string): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new NotFoundError("Errand", errandId);
    }

    if (errand.status !== "requested") {
      throw new InvalidStateTransition(
        "Errand",
        errand.status,
        "accepted",
        "Errand is no longer available",
      );
    }

    const rider = this.db
      .prepare("SELECT id, status, available FROM riders WHERE id = ?")
      .get(riderId) as
      | { id: string; status: string; available: number }
      | undefined;

    if (!rider) {
      throw new NotFoundError("Rider", riderId);
    }

    if (rider.status !== "active") {
      throw new BusinessRuleViolation("Rider is not active");
    }

    if (!rider.available) {
      throw new BusinessRuleViolation("Rider is not available");
    }

    const activeErrand = this.db
      .prepare(
        "SELECT id FROM errands WHERE rider_id = ? AND status IN ('accepted', 'picked_up')",
      )
      .get(riderId) as { id: string } | undefined;

    if (activeErrand) {
      throw new BusinessRuleViolation("Rider has an active errand");
    }

    if (!isValidErrandTransition(errand.status, "accepted")) {
      throw new InvalidStateTransition("Errand", errand.status, "accepted");
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE errands SET status = 'accepted', rider_id = ?, accepted_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(riderId, now, now, errandId);

    this.db
      .prepare("UPDATE riders SET available = 0, updated_at = ? WHERE id = ?")
      .run(now, riderId);

    this.logger.info("Errand accepted", { errandId, riderId });

    return this.getById(errandId) as Errand;
  }

  markPickedUp(errandId: string, riderId: string): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new NotFoundError("Errand", errandId);
    }

    if (errand.rider_id !== riderId) {
      throw new ForbiddenError("Not authorized for this errand");
    }

    if (!isValidErrandTransition(errand.status, "picked_up")) {
      throw new InvalidStateTransition(
        "Errand",
        errand.status,
        "picked_up",
        "Valid transitions are: requested\u2192accepted, accepted\u2192picked_up, picked_up\u2192delivered",
      );
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE errands SET status = 'picked_up', picked_up_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(now, now, errandId);

    this.logger.info("Errand picked up", { errandId, riderId });

    return this.getById(errandId) as Errand;
  }

  markDelivered(errandId: string, riderId: string): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new NotFoundError("Errand", errandId);
    }

    if (errand.rider_id !== riderId) {
      throw new ForbiddenError("Not authorized for this errand");
    }

    if (!isValidErrandTransition(errand.status, "delivered")) {
      throw new InvalidStateTransition(
        "Errand",
        errand.status,
        "delivered",
        "Valid transitions are: requested\u2192accepted, accepted\u2192picked_up, picked_up\u2192delivered",
      );
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE errands SET status = 'delivered', delivered_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(now, now, errandId);

    this.db
      .prepare("UPDATE riders SET available = 1, updated_at = ? WHERE id = ?")
      .run(now, riderId);

    this.logger.info("Errand delivered", { errandId, riderId });

    return this.getById(errandId) as Errand;
  }

  cancel(
    errandId: string,
    actorId: string,
    role: Role,
    reason?: string,
  ): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new NotFoundError("Errand", errandId);
    }

    if (errand.status === "delivered" || errand.status === "cancelled") {
      throw new InvalidStateTransition(
        "Errand",
        errand.status,
        "cancelled",
        "Errand cannot be cancelled in its current state",
      );
    }

    if (!isValidErrandTransition(errand.status, "cancelled")) {
      throw new InvalidStateTransition(
        "Errand",
        errand.status,
        "cancelled",
        "Errand cannot be cancelled in its current state",
      );
    }

    if (role === "user" && errand.status === "picked_up") {
      throw new BusinessRuleViolation(
        "Only the rider can cancel in picked_up state",
      );
    }

    if (errand.status === "accepted" || errand.status === "picked_up") {
      if (!reason || reason.trim().length < 10 || reason.trim().length > 500) {
        throw new ValidationError(
          "Cancellation reason required (between 10 and 500 characters)",
        );
      }
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE errands SET status = 'cancelled', cancellation_reason = ?, cancelled_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(reason ?? null, now, now, errandId);

    if (
      errand.rider_id &&
      (errand.status === "accepted" || errand.status === "picked_up")
    ) {
      this.db
        .prepare("UPDATE riders SET available = 1, updated_at = ? WHERE id = ?")
        .run(now, errand.rider_id);
    }

    this.logger.info("Errand cancelled", { errandId, actorId, role });

    return this.getById(errandId) as Errand;
  }

  async getRoutePreviewForRider(
    errandId: string,
    riderId: string,
  ): ReturnType<RoutingProvider["getRoute"]> {
    const errand = this.getById(errandId);

    if (!errand) {
      throw new NotFoundError("Errand", errandId);
    }

    const isAvailable = errand.status === "requested";
    const isAssignedToRider = errand.rider_id === riderId;
    if (!isAvailable && !isAssignedToRider) {
      throw new ForbiddenError("Errand route is not available");
    }

    if (
      errand.origin_lat == null ||
      errand.origin_lng == null ||
      errand.destination_lat == null ||
      errand.destination_lng == null
    ) {
      throw new ConflictError("Errand route is not available");
    }

    return this.estimateRoute(
      { latitude: errand.origin_lat, longitude: errand.origin_lng },
      {
        latitude: errand.destination_lat,
        longitude: errand.destination_lng,
      },
    );
  }

  listAvailable(): Errand[] {
    return this.db
      .prepare(
        "SELECT * FROM errands WHERE status = 'requested' ORDER BY requested_at DESC",
      )
      .all() as Errand[];
  }

  listByUser(
    userId: string,
    filters?: ErrandFilters,
    page?: number,
  ): PaginatedResult<Errand> {
    const pageSize = 20;
    const currentPage = Math.max(1, page ?? 1);
    const offset = (currentPage - 1) * pageSize;

    const conditions: string[] = ["user_id = ?"];
    const params: unknown[] = [userId];

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const whereClause = ` WHERE ${conditions.join(" AND ")}`;

    const countSql = `SELECT COUNT(*) as total FROM errands${whereClause}`;
    const dataSql = `SELECT * FROM errands${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const totalRow = this.db.prepare(countSql).get(...params) as {
      total: number;
    };
    const total = totalRow.total;

    const dataParams = [...params, pageSize, offset];
    const data = this.db.prepare(dataSql).all(...dataParams) as Errand[];

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page: currentPage,
      pageSize,
      totalPages,
    };
  }

  listByRider(
    riderId: string,
    filters?: ErrandFilters,
    page?: number,
  ): PaginatedResult<Errand> {
    const pageSize = 20;
    const currentPage = Math.max(1, page ?? 1);
    const offset = (currentPage - 1) * pageSize;

    const conditions: string[] = ["rider_id = ?"];
    const params: unknown[] = [riderId];

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const whereClause = ` WHERE ${conditions.join(" AND ")}`;

    const countSql = `SELECT COUNT(*) as total FROM errands${whereClause}`;
    const dataSql = `SELECT * FROM errands${whereClause} ORDER BY accepted_at DESC LIMIT ? OFFSET ?`;

    const totalRow = this.db.prepare(countSql).get(...params) as {
      total: number;
    };
    const total = totalRow.total;

    const dataParams = [...params, pageSize, offset];
    const data = this.db.prepare(dataSql).all(...dataParams) as Errand[];

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page: currentPage,
      pageSize,
      totalPages,
    };
  }

  getById(errandId: string): Errand | null {
    const row = this.db
      .prepare("SELECT * FROM errands WHERE id = ?")
      .get(errandId) as Errand | undefined;

    return row ?? null;
  }
}
