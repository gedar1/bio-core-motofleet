import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule, PaginatedResult } from "./IMolecule.js";
import {
  isValidMotorcycleTransition,
  getValidMotorcycleTransitions,
} from "../atoms/stateMachines.js";
import type { MotorcycleState } from "../atoms/stateMachines.js";
import {
  BusinessRuleViolation,
  ConflictError,
  InvalidStateTransition,
  NotFoundError,
  ValidationError,
} from "../domains/errors.js";

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

export interface UpdateMotorcycleInput {
  color?: string;
  engine_cc?: number;
  soat_expiry?: string;
  inspection_expiry?: string;
}

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

export interface MotorcycleFilters {
  status?: MotorcycleState;
}

export class MotorcycleMolecule implements IMolecule {
  readonly name = "motorcycles";
  readonly version = "1.0.0";
  readonly description = "Motorcycle CRUD and state-machine transitions.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  create(data: CreateMotorcycleInput): Motorcycle {
    const existing = this.db
      .prepare("SELECT id FROM motorcycles WHERE plate = ?")
      .get(data.plate) as { id: string } | undefined;

    if (existing) {
      throw new ConflictError("Plate is already registered");
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

  update(id: string, data: UpdateMotorcycleInput): Motorcycle {
    const existing = this.getById(id);
    if (!existing) {
      throw new NotFoundError("Motorcycle", id);
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

  changeStatus(id: string, newStatus: MotorcycleState): Motorcycle {
    const existing = this.getById(id);
    if (!existing) {
      throw new NotFoundError("Motorcycle", id);
    }

    const currentStatus = existing.status;
    const hasActiveContract = this.hasActiveContract(id);

    if (newStatus === "retired" && hasActiveContract) {
      throw new BusinessRuleViolation(
        "Motorcycle has an active contract and cannot be retired",
      );
    }

    const context = { hasActiveContract };
    if (!isValidMotorcycleTransition(currentStatus, newStatus, context)) {
      const validTransitions = getValidMotorcycleTransitions(
        currentStatus,
        context,
      );
      throw new InvalidStateTransition(
        "Motorcycle",
        currentStatus,
        newStatus,
        `Valid transitions: ${validTransitions.join(", ")}`,
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

  getById(id: string): Motorcycle | null {
    const row = this.db
      .prepare("SELECT * FROM motorcycles WHERE id = ?")
      .get(id) as Motorcycle | undefined;

    return row ?? null;
  }

  private hasActiveContract(motorcycleId: string): boolean {
    const row = this.db
      .prepare(
        "SELECT id FROM rental_contracts WHERE motorcycle_id = ? AND status = 'active'",
      )
      .get(motorcycleId) as { id: string } | undefined;

    return !!row;
  }
}
