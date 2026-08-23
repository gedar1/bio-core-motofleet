import type Database from "better-sqlite3";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule, PaginatedResult } from "./IMolecule.js";

export interface ErrandsByStatus {
  status: string;
  count: number;
}

export interface MotorcyclesByStatus {
  status: string;
  count: number;
}

export interface ContractsByStatus {
  status: string;
  count: number;
}

export interface AdminErrandFilters {
  status?: string;
  type?: string;
  rider_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AdminErrand {
  id: string;
  user_id: string;
  rider_id: string | null;
  rider_name: string | null;
  motorcycle_plate: string | null;
  type: string;
  description: string;
  origin_address: string;
  destination_address: string;
  fare: number;
  platform_commission: number;
  rider_earnings: number;
  status: string;
  payment_method: string;
  requested_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

/**
 * Molecule responsible for admin metrics and reporting.
 * Provides aggregated counts, totals, and filtered errand lists.
 */
export class MetricsMolecule implements IMolecule {
  readonly name = "metrics";
  readonly version = "1.0.0";
  readonly description =
    "Admin metrics: aggregated counts, totals, and filtered errand lists.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Returns count of errands by status within a date period.
   * Period filters by requested_at.
   */
  getErrandsByStatus(startDate: string, endDate: string): ErrandsByStatus[] {
    const results = this.db
      .prepare(
        `SELECT status, COUNT(*) as count FROM errands
         WHERE requested_at >= ? AND requested_at < ?
         GROUP BY status`,
      )
      .all(startDate, endDate + " 23:59:59") as ErrandsByStatus[];

    return results;
  }

  /**
   * Returns the total commission for delivered errands in a date period.
   * Filters by delivered_at.
   */
  getCommissionTotal(startDate: string, endDate: string): number {
    const result = this.db
      .prepare(
        `SELECT COALESCE(SUM(platform_commission), 0) as total FROM errands
         WHERE status = 'delivered' AND delivered_at >= ? AND delivered_at < ?`,
      )
      .get(startDate, endDate + " 23:59:59") as { total: number };

    return result.total;
  }

  /**
   * Returns count of motorcycles by status.
   */
  getMotorcyclesByStatus(): MotorcyclesByStatus[] {
    return this.db
      .prepare(
        "SELECT status, COUNT(*) as count FROM motorcycles GROUP BY status",
      )
      .all() as MotorcyclesByStatus[];
  }

  /**
   * Returns count of contracts by status.
   */
  getContractsByStatus(): ContractsByStatus[] {
    return this.db
      .prepare(
        "SELECT status, COUNT(*) as count FROM rental_contracts GROUP BY status",
      )
      .all() as ContractsByStatus[];
  }

  /**
   * Returns total rental payments amount in a date period.
   * Filters by period field (format YYYY-MM).
   * Converts period dates to YYYY-MM for comparison.
   */
  getRentalPaymentsTotal(startDate: string, endDate: string): number {
    // Convert date range to period range (YYYY-MM)
    const startPeriod = startDate.substring(0, 7);
    const endPeriod = endDate.substring(0, 7);

    const result = this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM rental_payments
         WHERE period >= ? AND period <= ?`,
      )
      .get(startPeriod, endPeriod) as { total: number };

    return result.total;
  }

  /**
   * Admin errand list with multiple filters and pagination (max 50/page).
   * Filters: status, type, rider_id, date range (requested_at).
   * Ordered by requested_at DESC.
   */
  listErrands(
    filters?: AdminErrandFilters,
    page?: number,
  ): PaginatedResult<AdminErrand> {
    const pageSize = 50;
    const currentPage = Math.max(1, page ?? 1);
    const offset = (currentPage - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      conditions.push("e.status = ?");
      params.push(filters.status);
    }

    if (filters?.type) {
      conditions.push("e.type = ?");
      params.push(filters.type);
    }

    if (filters?.rider_id) {
      conditions.push("e.rider_id = ?");
      params.push(filters.rider_id);
    }

    if (filters?.start_date) {
      conditions.push("e.requested_at >= ?");
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      conditions.push("e.requested_at <= ?");
      params.push(filters.end_date + " 23:59:59");
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) as total FROM errands e${whereClause}`;
    const totalRow = this.db.prepare(countSql).get(...params) as {
      total: number;
    };
    const total = totalRow.total;

    const dataSql = `
      SELECT e.*, r.name as rider_name,
        (SELECT m.plate FROM rental_contracts rc
         JOIN motorcycles m ON m.id = rc.motorcycle_id
         WHERE rc.rider_id = e.rider_id LIMIT 1) as motorcycle_plate
      FROM errands e
      LEFT JOIN riders r ON r.id = e.rider_id
      ${whereClause}
      ORDER BY e.requested_at DESC LIMIT ? OFFSET ?`;

    const dataParams = [...params, pageSize, offset];
    const data = this.db.prepare(dataSql).all(...dataParams) as AdminErrand[];

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page: currentPage,
      pageSize,
      totalPages,
    };
  }
}

// --- Additional admin methods appended ---

/**
 * Standalone function to list all riders for admin (used by metrics routes).
 * Needs db passed directly since it's outside the class.
 */
export function listAllRiders(
  db: import("better-sqlite3").Database,
): Array<Record<string, unknown>> {
  return db
    .prepare(
      `SELECT id, name, phone, email, address, document_type, license_number,
              license_expiry, insurance_number, insurance_expiry, bond_amount,
              status, available, created_at
       FROM riders ORDER BY created_at DESC`,
    )
    .all() as Array<Record<string, unknown>>;
}

export function listMotorcyclesForSelection(
  db: import("better-sqlite3").Database,
): Array<{
  id: string;
  plate: string;
  brand: string;
  model: string;
  status: string;
}> {
  return db
    .prepare(
      "SELECT id, plate, brand, model, status FROM motorcycles ORDER BY plate",
    )
    .all() as Array<{
    id: string;
    plate: string;
    brand: string;
    model: string;
    status: string;
  }>;
}

/** Lightweight admin selector intentionally excludes identity-document values. */
export function listRidersForSelection(
  db: import("better-sqlite3").Database,
): Array<{ id: string; name: string; phone: string; status: string }> {
  return db
    .prepare("SELECT id, name, phone, status FROM riders ORDER BY name")
    .all() as Array<{
    id: string;
    name: string;
    phone: string;
    status: string;
  }>;
}
