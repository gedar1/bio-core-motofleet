import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule, PaginatedResult } from "./IMolecule.js";
import {
  isValidMotorcycleTransition,
  getValidMotorcycleTransitions,
} from "../atoms/stateMachines.js";
import type { MotorcycleState } from "../atoms/stateMachines.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

/**
 * Data required to register a new motorcycle.
 */
export interface CreateMotorcycleInput {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  engine_cc: number;
  soat_expiry: string;
  inspection_expiry: string;
}

/**
 * Fields allowed to be updated on a motorcycle.
 */
export interface UpdateMotorcycleInput {
  color?: string;
  engine_cc?: number;
  soat_expiry?: string;
  inspection_expiry?: string;
}

/**
 * Motorcycle record as stored in the database.
 */
export interface Motorcycle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  engine_cc: number;
  soat_expiry: string;
  inspection_expiry: string;
  status: MotorcycleState;
  created_at: string;
  updated_at: string;
}

/**
 * Optional filters for listing motorcycles.
 */
export interface MotorcycleFilters {
  status?: MotorcycleState;
}

/**
 * Molecule responsible for motorcycle CRUD and state management.
 * Validates plate uniqueness, enforces state machine transitions,
 * and checks business rules (active contracts block retirement).
 */
export class MotorcycleMolecule implements IMolecule {
  readonly name = "motorcycles";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Registers a new motorcycle with status='available'.
   * @throws AppError(409, 'CONFLICT') if plate already exists.
   */
  create(data: CreateMotorcycleInput): Motorcycle {
    // Check plate uniqueness
    const existing = this.db
      .prepare("SELECT id FROM motorcycles WHERE plate = ?")
      .get(data.plate) as { id: string } | undefined;

    if (existing) {
      throw new AppError(409, "CONFLICT", "Plate is already registered");
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const stmt = this.db.prepare(`
      INSERT INTO motorcycles (id, plate, brand, model, year, color, engine_cc, soat_expiry, inspection_expiry, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)
    `);

    stmt.run(
      id,
      data.plate,
      data.brand,
      data.model,
      data.year,
      data.color,
      data.engine_cc,
      data.soat_expiry,
      data.inspection_expiry,
      now,
      now,
    );

    this.logger.info("Motorcycle registered", {
      motorcycleId: id,
      plate: data.plate,
    });

    return this.getById(id) as Motorcycle;
  }

  /**
   * Updates allowed fields on a motorcycle (color, engine_cc, soat_expiry, inspection_expiry).
   * Sets updated_at to current timestamp.
   * @throws AppError(404, 'NOT_FOUND') if motorcycle doesn't exist.
   */
  update(id: string, data: UpdateMotorcycleInput): Motorcycle {
    const existing = this.getById(id);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Motorcycle not found");
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.color !== undefined) {
      fields.push("color = ?");
      values.push(data.color);
    }
    if (data.engine_cc !== undefined) {
      fields.push("engine_cc = ?");
      values.push(data.engine_cc);
    }
    if (data.soat_expiry !== undefined) {
      fields.push("soat_expiry = ?");
      values.push(data.soat_expiry);
    }
    if (data.inspection_expiry !== undefined) {
      fields.push("inspection_expiry = ?");
      values.push(data.inspection_expiry);
    }

    if (fields.length === 0) {
      return existing;
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);

    const sql = `UPDATE motorcycles SET ${fields.join(", ")} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    this.logger.info("Motorcycle updated", { motorcycleId: id });

    return this.getById(id) as Motorcycle;
  }

  /**
   * Changes the motorcycle state, enforcing the state machine transitions.
   * For transitions to 'retired', checks if motorcycle has an active rental contract.
   * @throws AppError(400, 'INVALID_STATE_TRANSITION') if transition is not allowed by state machine.
   * @throws AppError(400, 'BUSINESS_RULE_VIOLATION') if motorcycle has active contract and trying to retire.
   */
  changeStatus(id: string, newStatus: MotorcycleState): Motorcycle {
    const existing = this.getById(id);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Motorcycle not found");
    }

    const currentStatus = existing.status;

    // Check if there's an active contract for this motorcycle
    const hasActiveContract = this.hasActiveContract(id);

    // For transitions to 'retired', check active contract business rule
    if (newStatus === "retired" && hasActiveContract) {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "Motorcycle has an active contract and cannot be retired",
      );
    }

    // Validate state transition using state machine
    const context = { hasActiveContract };
    if (!isValidMotorcycleTransition(currentStatus, newStatus, context)) {
      const validTransitions = getValidMotorcycleTransitions(
        currentStatus,
        context,
      );
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        `Invalid state transition: ${currentStatus} → ${newStatus}`,
        { validTransitions: validTransitions as unknown as string[] },
      );
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare("UPDATE motorcycles SET status = ?, updated_at = ? WHERE id = ?")
      .run(newStatus, now, id);

    this.logger.info("Motorcycle status changed", {
      motorcycleId: id,
      from: currentStatus,
      to: newStatus,
    });

    return this.getById(id) as Motorcycle;
  }

  /**
   * Lists motorcycles with optional status filter and pagination.
   * Max 100 results per page.
   */
  list(
    filters?: MotorcycleFilters,
    page?: number,
  ): PaginatedResult<Motorcycle> {
    const pageSize = 100;
    const currentPage = Math.max(1, page ?? 1);
    const offset = (currentPage - 1) * pageSize;

    let countSql = "SELECT COUNT(*) as total FROM motorcycles";
    let dataSql = "SELECT * FROM motorcycles";
    const params: unknown[] = [];

    if (filters?.status) {
      const whereClause = " WHERE status = ?";
      countSql += whereClause;
      dataSql += whereClause;
      params.push(filters.status);
    }

    dataSql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

    const totalRow = this.db.prepare(countSql).get(...params) as {
      total: number;
    };
    const total = totalRow.total;

    const dataParams = [...params, pageSize, offset];
    const data = this.db.prepare(dataSql).all(...dataParams) as Motorcycle[];

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
   * Retrieves a motorcycle by its UUID.
   * @returns The motorcycle record or null if not found.
   */
  getById(id: string): Motorcycle | null {
    const row = this.db
      .prepare("SELECT * FROM motorcycles WHERE id = ?")
      .get(id) as Motorcycle | undefined;

    return row ?? null;
  }

  /**
   * Checks if the motorcycle has an active rental contract.
   */
  private hasActiveContract(motorcycleId: string): boolean {
    const row = this.db
      .prepare(
        "SELECT id FROM rental_contracts WHERE motorcycle_id = ? AND status = 'active'",
      )
      .get(motorcycleId) as { id: string } | undefined;

    return !!row;
  }
}
