import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule, PaginatedResult, Role } from "./IMolecule.js";
import { isValidErrandTransition } from "../atoms/stateMachines.js";
import type { ErrandState } from "../atoms/stateMachines.js";
import { haversineDistance } from "../atoms/haversine.js";
import { calculateFare } from "../atoms/tarifa.js";
import { AppError } from "../middleware/errorHandler.middleware.js";
import type { RoutingProvider } from "../domains/errands/RoutingProvider.js";

export type ErrandType = "object_transport" | "purchase" | "errand";

export interface CreateErrandInput {
  type: ErrandType;
  description: string;
  origin_address: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_address: string;
  destination_lat?: number;
  destination_lng?: number;
  payment_method: "cash" | "transfer";
}

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
  /** Null only for historical rows that predate migration 003. */
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

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
    private readonly routingProvider?: RoutingProvider,
    private readonly allowHaversineFallback = false,
  ) {}

  /**
   * Creates a new errand.
   * Validates user active, gets pricing rule, calculates fare via atoms.
   */
  async create(userId: string, data: CreateErrandInput): Promise<Errand> {
    // Validate user exists and is active
    const user = this.db
      .prepare("SELECT id, status FROM users WHERE id = ?")
      .get(userId) as { id: string; status: string } | undefined;

    if (!user) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }

    if (user.status !== "active") {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "User account is not active",
      );
    }

    // Validate description length
    if (data.description.length < 10 || data.description.length > 500) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Description must be between 10 and 500 characters",
      );
    }

    // Validate addresses not empty
    if (!data.origin_address || data.origin_address.trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "Origin address is required");
    }

    if (!data.destination_address || data.destination_address.trim() === "") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Destination address is required",
      );
    }

    // Get active pricing rule for the errand type
    const pricingRule = this.db
      .prepare(
        "SELECT * FROM pricing_rules WHERE errand_type = ? AND active = 1",
      )
      .get(data.type) as
      | {
          base_rate: number;
          rate_per_km: number;
          commission_percentage: number;
        }
      | undefined;

    if (!pricingRule) {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "No pricing configured for this errand type",
      );
    }

    // The provider's road distance is authoritative for productive pricing.
    const estimatedDistance = await this.calculateEstimatedDistance(data);

    // The active rule stores integer COP values. Its commission percentage is
    // converted to basis points before entering the canonical fare atom.
    const pricing = calculateFare({
      baseRateCop: pricingRule.base_rate,
      ratePerKmCop: pricingRule.rate_per_km,
      commissionBasisPoints: pricingRule.commission_percentage * 100,
      distanceKm: estimatedDistance,
    });

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        `
      INSERT INTO errands (id, user_id, rider_id, type, description, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, estimated_distance, fare, platform_commission, rider_earnings, fare_cop, platform_commission_cop, rider_earnings_cop, status, payment_method, requested_at, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?)
    `,
      )
      .run(
        id,
        userId,
        data.type,
        data.description,
        data.origin_address,
        data.origin_lat ?? null,
        data.origin_lng ?? null,
        data.destination_address,
        data.destination_lat ?? null,
        data.destination_lng ?? null,
        estimatedDistance,
        pricing.fareCop,
        pricing.platformCommissionCop,
        pricing.riderEarningsCop,
        pricing.fareCop,
        pricing.platformCommissionCop,
        pricing.riderEarningsCop,
        data.payment_method,
        now,
        now,
        now,
      );

    this.logger.info("Errand created", {
      errandId: id,
      userId,
      type: data.type,
    });

    return this.getById(id) as Errand;
  }

  /**
   * Retrieves a route preview through the configured provider. This operation
   * deliberately has no pricing, persistence, or errand-creation side effects.
   */
  async estimateRoute(
    origin: Parameters<RoutingProvider["getRoute"]>[0],
    destination: Parameters<RoutingProvider["getRoute"]>[1],
  ): ReturnType<RoutingProvider["getRoute"]> {
    if (!this.routingProvider) {
      throw new AppError(
        503,
        "ROUTING_UNAVAILABLE",
        "Routing service is temporarily unavailable",
      );
    }

    try {
      return await this.routingProvider.getRoute(origin, destination);
    } catch {
      this.logger.warn("Route estimate unavailable");
      throw new AppError(
        503,
        "ROUTING_UNAVAILABLE",
        "Routing service is temporarily unavailable",
      );
    }
  }

  private async calculateEstimatedDistance(
    data: CreateErrandInput,
  ): Promise<number> {
    const originLatitude = data.origin_lat;
    const originLongitude = data.origin_lng;
    const destinationLatitude = data.destination_lat;
    const destinationLongitude = data.destination_lng;

    if (
      originLatitude == null ||
      originLongitude == null ||
      destinationLatitude == null ||
      destinationLongitude == null
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Origin and destination coordinates are required for route pricing",
      );
    }

    const fallbackDistance = haversineDistance(
      { lat: originLatitude, lng: originLongitude },
      { lat: destinationLatitude, lng: destinationLongitude },
    );

    if (!this.routingProvider) {
      if (this.allowHaversineFallback) return fallbackDistance;
      throw new AppError(
        503,
        "ROUTING_UNAVAILABLE",
        "Routing service is temporarily unavailable",
      );
    }

    try {
      const route = await this.routingProvider.getRoute(
        { latitude: originLatitude, longitude: originLongitude },
        { latitude: destinationLatitude, longitude: destinationLongitude },
      );
      return Math.max(0.5, route.distanceKm);
    } catch {
      if (this.allowHaversineFallback) {
        this.logger.warn(
          "Route provider failed; using configured Haversine fallback",
        );
        return fallbackDistance;
      }

      this.logger.warn("Route provider unavailable for errand pricing");
      throw new AppError(
        503,
        "ROUTING_UNAVAILABLE",
        "Routing service is temporarily unavailable",
      );
    }
  }

  /**
   * Accepts an errand. Validates rider available, errand in requested state.
   * Assigns rider, sets rider available=false.
   */
  accept(errandId: string, riderId: string): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new AppError(404, "NOT_FOUND", "Errand not found");
    }

    if (errand.status !== "requested") {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        "Errand is no longer available",
      );
    }

    // Validate rider exists, is active, and is available
    const rider = this.db
      .prepare("SELECT id, status, available FROM riders WHERE id = ?")
      .get(riderId) as
      | { id: string; status: string; available: number }
      | undefined;

    if (!rider) {
      throw new AppError(404, "NOT_FOUND", "Rider not found");
    }

    if (rider.status !== "active") {
      throw new AppError(400, "BUSINESS_RULE_VIOLATION", "Rider is not active");
    }

    if (!rider.available) {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "Rider is not available",
      );
    }

    // Check rider doesn't have an active errand
    const activeErrand = this.db
      .prepare(
        "SELECT id FROM errands WHERE rider_id = ? AND status IN ('accepted', 'picked_up')",
      )
      .get(riderId) as { id: string } | undefined;

    if (activeErrand) {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "Rider has an active errand",
      );
    }

    if (!isValidErrandTransition(errand.status, "accepted")) {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        "Invalid state transition",
      );
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE errands SET status = 'accepted', rider_id = ?, accepted_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(riderId, now, now, errandId);

    // Set rider available to false
    this.db
      .prepare("UPDATE riders SET available = 0, updated_at = ? WHERE id = ?")
      .run(now, riderId);

    this.logger.info("Errand accepted", { errandId, riderId });

    return this.getById(errandId) as Errand;
  }

  /**
   * Marks errand as picked up. Transition: accepted→picked_up.
   */
  markPickedUp(errandId: string, riderId: string): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new AppError(404, "NOT_FOUND", "Errand not found");
    }

    if (errand.rider_id !== riderId) {
      throw new AppError(403, "FORBIDDEN", "Not authorized for this errand");
    }

    if (!isValidErrandTransition(errand.status, "picked_up")) {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        "Valid transitions are: requested→accepted, accepted→picked_up, picked_up→delivered",
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

  /**
   * Marks errand as delivered. Transition: picked_up→delivered.
   * Sets rider available=true.
   */
  markDelivered(errandId: string, riderId: string): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new AppError(404, "NOT_FOUND", "Errand not found");
    }

    if (errand.rider_id !== riderId) {
      throw new AppError(403, "FORBIDDEN", "Not authorized for this errand");
    }

    if (!isValidErrandTransition(errand.status, "delivered")) {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        "Valid transitions are: requested→accepted, accepted→picked_up, picked_up→delivered",
      );
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE errands SET status = 'delivered', delivered_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(now, now, errandId);

    // Set rider available to true
    this.db
      .prepare("UPDATE riders SET available = 1, updated_at = ? WHERE id = ?")
      .run(now, riderId);

    this.logger.info("Errand delivered", { errandId, riderId });

    return this.getById(errandId) as Errand;
  }

  /**
   * Cancels an errand. Applies cancellation rules by role and state.
   * - User can cancel requested (no reason required) or accepted (reason required)
   * - User cannot cancel picked_up
   * - Rider can cancel accepted or picked_up (reason required)
   * - Cannot cancel delivered or already cancelled
   */
  cancel(
    errandId: string,
    actorId: string,
    role: Role,
    reason?: string,
  ): Errand {
    const errand = this.getById(errandId);
    if (!errand) {
      throw new AppError(404, "NOT_FOUND", "Errand not found");
    }

    // Cannot cancel terminal states
    if (errand.status === "delivered" || errand.status === "cancelled") {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        "Errand cannot be cancelled in its current state",
      );
    }

    if (!isValidErrandTransition(errand.status, "cancelled")) {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        "Errand cannot be cancelled in its current state",
      );
    }

    // User cannot cancel picked_up
    if (role === "user" && errand.status === "picked_up") {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "Only the rider can cancel in picked_up state",
      );
    }

    // Reason required for accepted or picked_up
    if (errand.status === "accepted" || errand.status === "picked_up") {
      if (!reason || reason.trim().length < 10 || reason.trim().length > 500) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
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

    // If errand had a rider assigned, set rider available back to true
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
      throw new AppError(404, "NOT_FOUND", "Errand not found");
    }

    const isAvailable = errand.status === "requested";
    const isAssignedToRider = errand.rider_id === riderId;
    if (!isAvailable && !isAssignedToRider) {
      throw new AppError(403, "FORBIDDEN", "Errand route is not available");
    }

    if (
      errand.origin_lat == null ||
      errand.origin_lng == null ||
      errand.destination_lat == null ||
      errand.destination_lng == null
    ) {
      throw new AppError(
        409,
        "ROUTE_UNAVAILABLE",
        "Errand route is not available",
      );
    }

    return this.estimateRoute(
      { latitude: errand.origin_lat, longitude: errand.origin_lng },
      {
        latitude: errand.destination_lat,
        longitude: errand.destination_lng,
      },
    );
  }

  /**
   * Lists available errands (status=requested), ordered by requested_at DESC.
   */
  listAvailable(): Errand[] {
    return this.db
      .prepare(
        "SELECT * FROM errands WHERE status = 'requested' ORDER BY requested_at DESC",
      )
      .all() as Errand[];
  }

  /**
   * Lists errands for a user with optional filters and pagination (max 20/page).
   */
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

  /**
   * Lists errands assigned to a rider with optional filters and pagination (max 20/page).
   */
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

  /**
   * Retrieves an errand by its UUID.
   */
  getById(errandId: string): Errand | null {
    const row = this.db
      .prepare("SELECT * FROM errands WHERE id = ?")
      .get(errandId) as Errand | undefined;

    return row ?? null;
  }
}
