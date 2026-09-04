import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule, PaginatedResult } from "./IMolecule.js";
import { isValidContractTransition } from "../atoms/stateMachines.js";
import type { ContractState } from "../atoms/stateMachines.js";
import { getCurrentUtcTimestamp } from "../atoms/dateUtils.js";
import {
  BusinessRuleViolation,
  ConflictError,
  InvalidStateTransition,
  NotFoundError,
  ValidationError,
} from "../domains/errors.js";

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

export class ContractMolecule implements IMolecule {
  readonly name = "contracts";
  readonly version = "1.0.0";
  readonly description =
    "Rental contract lifecycle: creation, cancellation, renewal, and expiration.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  create(data: CreateContractInput): RentalContract {
    const motorcycle = this.db
      .prepare("SELECT id, status FROM motorcycles WHERE id = ?")
      .get(data.motorcycle_id) as { id: string; status: string } | undefined;

    if (!motorcycle) {
      throw new NotFoundError("Motorcycle", data.motorcycle_id);
    }

    if (motorcycle.status !== "available") {
      throw new BusinessRuleViolation("Motorcycle is not available for rental");
    }

    const rider = this.db
      .prepare("SELECT id, status FROM riders WHERE id = ?")
      .get(data.rider_id) as { id: string; status: string } | undefined;

    if (!rider) {
      throw new NotFoundError("Rider", data.rider_id);
    }

    if (rider.status !== "active") {
      throw new BusinessRuleViolation("Rider is not active");
    }

    const activeContractMoto = this.db
      .prepare(
        "SELECT id FROM rental_contracts WHERE motorcycle_id = ? AND status = 'active'",
      )
      .get(data.motorcycle_id) as { id: string } | undefined;

    if (activeContractMoto) {
      throw new ConflictError(
        "Motorcycle already has an active contract assigned",
      );
    }

    const activeContractRider = this.db
      .prepare(
        "SELECT id FROM rental_contracts WHERE rider_id = ? AND status = 'active'",
      )
      .get(data.rider_id) as { id: string } | undefined;

    if (activeContractRider) {
      throw new ConflictError("Rider already has an active contract");
    }

    const cosignerCount = this.db
      .prepare("SELECT COUNT(*) as count FROM cosigners WHERE rider_id = ?")
      .get(data.rider_id) as { count: number };

    if (cosignerCount.count === 0) {
      throw new BusinessRuleViolation("At least one cosigner is required");
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError("Invalid dates");
    }

    if (endDate <= startDate) {
      throw new ValidationError("end_date must be after start_date");
    }

    if (data.monthly_amount <= 0) {
      throw new ValidationError("Monthly amount must be greater than zero");
    }

    if (data.payment_day < 1 || data.payment_day > 28) {
      throw new ValidationError("Payment day must be between 1 and 28");
    }

    const id = uuidv4();
    const now = getCurrentUtcTimestamp();

    this.db
      .prepare(
        `INSERT INTO rental_contracts (id, rider_id, motorcycle_id, start_date, end_date, monthly_amount, payment_day, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
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

  cancel(contractId: string): RentalContract {
    const contract = this.getById(contractId);
    if (!contract) {
      throw new NotFoundError("Contract", contractId);
    }

    if (!isValidContractTransition(contract.status, "cancelled")) {
      throw new InvalidStateTransition(
        "Contract",
        contract.status,
        "cancelled",
      );
    }

    const now = getCurrentUtcTimestamp();

    const cancelContract = this.db.transaction(() => {
      this.db
        .prepare(
          "UPDATE rental_contracts SET status = 'cancelled', updated_at = ? WHERE id = ?",
        )
        .run(now, contractId);

      this.db
        .prepare(
          "UPDATE motorcycles SET status = 'available', updated_at = ? WHERE id = ?",
        )
        .run(now, contract.motorcycle_id);
    });

    cancelContract.immediate();

    this.logger.info("Contract cancelled", { contractId });

    return this.getById(contractId) as RentalContract;
  }

  renew(contractId: string, newEndDate: string): RentalContract {
    const contract = this.getById(contractId);
    if (!contract) {
      throw new NotFoundError("Contract", contractId);
    }

    if (!isValidContractTransition(contract.status, "renewed")) {
      throw new InvalidStateTransition("Contract", contract.status, "renewed");
    }

    const newDate = new Date(newEndDate);
    const currentEnd = new Date(contract.end_date);

    if (isNaN(newDate.getTime())) {
      throw new ValidationError("Invalid end date");
    }

    if (newDate <= currentEnd) {
      throw new ValidationError(
        "New end date must be after the current end date",
      );
    }

    const now = getCurrentUtcTimestamp();

    const renewContract = this.db.transaction(() => {
      this.db
        .prepare(
          "UPDATE rental_contracts SET status = 'renewed', end_date = ?, updated_at = ? WHERE id = ?",
        )
        .run(newEndDate, now, contractId);
    });

    renewContract.immediate();

    this.logger.info("Contract renewed", { contractId, newEndDate });

    return this.getById(contractId) as RentalContract;
  }

  expireOverdue(): number {
    const now = getCurrentUtcTimestamp();
    const today = now.substring(0, 10);

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

    batchExpire.immediate();

    this.logger.info("Contracts expired", { count: overdueContracts.length });

    return overdueContracts.length;
  }

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
    const dataSql = `
      SELECT rc.*, r.name as rider_name, m.plate as motorcycle_plate
      FROM rental_contracts rc
      LEFT JOIN riders r ON r.id = rc.rider_id
      LEFT JOIN motorcycles m ON m.id = rc.motorcycle_id
      ${whereClause} ORDER BY rc.created_at DESC LIMIT ? OFFSET ?`;

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

  getById(contractId: string): RentalContract | null {
    const row = this.db
      .prepare("SELECT * FROM rental_contracts WHERE id = ?")
      .get(contractId) as RentalContract | undefined;

    return row ?? null;
  }
}
