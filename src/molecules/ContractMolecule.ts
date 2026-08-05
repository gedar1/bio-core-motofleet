import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule, PaginatedResult } from "./IMolecule.js";
import { isValidContractTransition } from "../atoms/stateMachines.js";
import type { ContractState } from "../atoms/stateMachines.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

export interface CreateContractInput {
  rider_id: string;
  motorcycle_id: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  payment_day: number;
  notes?: string;
}

export interface RentalContract {
  id: string;
  rider_id: string;
  motorcycle_id: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  payment_day: number;
  status: ContractState;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractFilters {
  status?: ContractState;
  rider_id?: string;
  page?: number;
}

/**
 * Molecule responsible for rental contract lifecycle management.
 * Handles creation, cancellation, renewal, and batch expiration.
 */
export class ContractMolecule implements IMolecule {
  readonly name = "contracts";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Creates a new rental contract.
   * Validates: motorcycle available, rider active, no active contracts for either,
   * rider has cosigner, date and amount validations.
   * Sets motorcycle status to "rented".
   */
  create(data: CreateContractInput): RentalContract {
    // Validate motorcycle exists and is available
    const motorcycle = this.db
      .prepare("SELECT id, status FROM motorcycles WHERE id = ?")
      .get(data.motorcycle_id) as { id: string; status: string } | undefined;

    if (!motorcycle) {
      throw new AppError(404, "NOT_FOUND", "Motorcycle not found");
    }

    if (motorcycle.status !== "available") {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "Motorcycle is not available for rental",
      );
    }

    // Validate rider exists and is active
    const rider = this.db
      .prepare("SELECT id, status FROM riders WHERE id = ?")
      .get(data.rider_id) as { id: string; status: string } | undefined;

    if (!rider) {
      throw new AppError(404, "NOT_FOUND", "Rider not found");
    }

    if (rider.status !== "active") {
      throw new AppError(400, "BUSINESS_RULE_VIOLATION", "Rider is not active");
    }

    // Check no active contract for the motorcycle
    const activeContractMoto = this.db
      .prepare(
        "SELECT id FROM rental_contracts WHERE motorcycle_id = ? AND status = 'active'",
      )
      .get(data.motorcycle_id) as { id: string } | undefined;

    if (activeContractMoto) {
      throw new AppError(
        409,
        "CONFLICT",
        "Motorcycle already has an active contract assigned",
      );
    }

    // Check no active contract for the rider
    const activeContractRider = this.db
      .prepare(
        "SELECT id FROM rental_contracts WHERE rider_id = ? AND status = 'active'",
      )
      .get(data.rider_id) as { id: string } | undefined;

    if (activeContractRider) {
      throw new AppError(
        409,
        "CONFLICT",
        "Rider already has an active contract",
      );
    }

    // Check rider has at least one cosigner
    const cosignerCount = this.db
      .prepare("SELECT COUNT(*) as count FROM cosigners WHERE rider_id = ?")
      .get(data.rider_id) as { count: number };

    if (cosignerCount.count === 0) {
      throw new AppError(
        400,
        "BUSINESS_RULE_VIOLATION",
        "At least one cosigner is required",
      );
    }

    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid dates");
    }

    if (endDate <= startDate) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "end_date must be after start_date",
      );
    }

    // Validate amount
    if (data.monthly_amount <= 0) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Monthly amount must be greater than zero",
      );
    }

    // Validate payment_day
    if (data.payment_day < 1 || data.payment_day > 28) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Payment day must be between 1 and 28",
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Insert contract
    this.db
      .prepare(
        `
      INSERT INTO rental_contracts (id, rider_id, motorcycle_id, start_date, end_date, monthly_amount, payment_day, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `,
      )
      .run(
        id,
        data.rider_id,
        data.motorcycle_id,
        data.start_date,
        data.end_date,
        data.monthly_amount,
        data.payment_day,
        data.notes ?? null,
        now,
        now,
      );

    // Set motorcycle to rented
    this.db
      .prepare(
        "UPDATE motorcycles SET status = 'rented', updated_at = ? WHERE id = ?",
      )
      .run(now, data.motorcycle_id);

    this.logger.info("Contract created", {
      contractId: id,
      riderId: data.rider_id,
      motorcycleId: data.motorcycle_id,
    });

    return this.getById(id) as RentalContract;
  }

  /**
   * Cancels an active contract. Sets status=cancelled and motorcycle→available.
   */
  cancel(contractId: string): RentalContract {
    const contract = this.getById(contractId);
    if (!contract) {
      throw new AppError(404, "NOT_FOUND", "Contract not found");
    }

    if (!isValidContractTransition(contract.status, "cancelled")) {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        `Cannot cancel a contract in status ${contract.status}`,
      );
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE rental_contracts SET status = 'cancelled', updated_at = ? WHERE id = ?",
      )
      .run(now, contractId);

    // Set motorcycle back to available
    this.db
      .prepare(
        "UPDATE motorcycles SET status = 'available', updated_at = ? WHERE id = ?",
      )
      .run(now, contract.motorcycle_id);

    this.logger.info("Contract cancelled", { contractId });

    return this.getById(contractId) as RentalContract;
  }

  /**
   * Renews a contract with a new end date.
   * Validates new date > current end date, sets status=renewed.
   */
  renew(contractId: string, newEndDate: string): RentalContract {
    const contract = this.getById(contractId);
    if (!contract) {
      throw new AppError(404, "NOT_FOUND", "Contract not found");
    }

    if (!isValidContractTransition(contract.status, "renewed")) {
      throw new AppError(
        400,
        "INVALID_STATE_TRANSITION",
        `Cannot renew a contract in status ${contract.status}`,
      );
    }

    const newDate = new Date(newEndDate);
    const currentEnd = new Date(contract.end_date);

    if (isNaN(newDate.getTime())) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid end date");
    }

    if (newDate <= currentEnd) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "New end date must be after the current end date",
      );
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        "UPDATE rental_contracts SET status = 'renewed', end_date = ?, updated_at = ? WHERE id = ?",
      )
      .run(newEndDate, now, contractId);

    this.logger.info("Contract renewed", { contractId, newEndDate });

    return this.getById(contractId) as RentalContract;
  }

  /**
   * Batch job: marks overdue active contracts as expired and sets motorcycle→available.
   * Returns the number of contracts expired.
   */
  expireOverdue(): number {
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    const today = now.substring(0, 10);

    // Find active contracts past their end date
    const overdueContracts = this.db
      .prepare(
        "SELECT id, motorcycle_id FROM rental_contracts WHERE status = 'active' AND end_date < ?",
      )
      .all(today) as Array<{ id: string; motorcycle_id: string }>;

    if (overdueContracts.length === 0) {
      return 0;
    }

    const updateContract = this.db.prepare(
      "UPDATE rental_contracts SET status = 'expired', updated_at = ? WHERE id = ?",
    );
    const updateMotorcycle = this.db.prepare(
      "UPDATE motorcycles SET status = 'available', updated_at = ? WHERE id = ?",
    );

    const batchExpire = this.db.transaction(() => {
      for (const contract of overdueContracts) {
        updateContract.run(now, contract.id);
        updateMotorcycle.run(now, contract.motorcycle_id);
      }
    });

    batchExpire();

    this.logger.info("Contracts expired", { count: overdueContracts.length });

    return overdueContracts.length;
  }

  /**
   * Lists contracts with optional filters (status, rider_id) and pagination.
   */
  list(filters?: ContractFilters): PaginatedResult<RentalContract> {
    const pageSize = 100;
    const currentPage = Math.max(1, filters?.page ?? 1);
    const offset = (currentPage - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (filters?.rider_id) {
      conditions.push("rider_id = ?");
      params.push(filters.rider_id);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) as total FROM rental_contracts${whereClause}`;
    const dataSql = `SELECT * FROM rental_contracts${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const totalRow = this.db.prepare(countSql).get(...params) as {
      total: number;
    };
    const total = totalRow.total;

    const dataParams = [...params, pageSize, offset];
    const data = this.db
      .prepare(dataSql)
      .all(...dataParams) as RentalContract[];

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
   * Retrieves a contract by its UUID.
   */
  getById(contractId: string): RentalContract | null {
    const row = this.db
      .prepare("SELECT * FROM rental_contracts WHERE id = ?")
      .get(contractId) as RentalContract | undefined;

    return row ?? null;
  }
}
