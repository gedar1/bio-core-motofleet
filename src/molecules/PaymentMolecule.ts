import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

export interface CreatePaymentInput {
  amount: number;
  payment_date: string;
  payment_method: "cash" | "transfer";
  period: string;
  notes?: string;
}

export interface RentalPayment {
  id: string;
  contract_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  period: string;
  notes: string | null;
  created_at: string;
}

/**
 * Molecule responsible for rental payment management.
 * Handles payment creation and listing by contract.
 */
export class PaymentMolecule implements IMolecule {
  readonly name = "payments";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Creates a rental payment for a contract.
   * Validates: contract exists, period not already paid, format and amount.
   */
  create(contractId: string, data: CreatePaymentInput): RentalPayment {
    // Validate contract exists
    const contract = this.db
      .prepare("SELECT id FROM rental_contracts WHERE id = ?")
      .get(contractId) as { id: string } | undefined;

    if (!contract) {
      throw new AppError(404, "NOT_FOUND", "Contract not found");
    }

    // Validate amount > 0
    if (data.amount <= 0) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Amount must be greater than zero",
      );
    }

    // Validate period format YYYY-MM
    const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!periodRegex.test(data.period)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Period must have format YYYY-MM",
      );
    }

    // Validate payment_date is not future
    const paymentDate = new Date(data.payment_date);
    if (Number.isNaN(paymentDate.getTime())) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid payment date");
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (paymentDate > today) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Payment date cannot be a future date",
      );
    }

    // Validate payment_method
    if (!["cash", "transfer"].includes(data.payment_method)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Payment method must be cash or transfer",
      );
    }

    // Check period not already paid
    const existingPayment = this.db
      .prepare(
        "SELECT id FROM rental_payments WHERE contract_id = ? AND period = ?",
      )
      .get(contractId, data.period) as { id: string } | undefined;

    if (existingPayment) {
      throw new AppError(
        409,
        "CONFLICT",
        "Period already has a registered payment",
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        `
      INSERT INTO rental_payments (id, contract_id, amount, payment_date, payment_method, period, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        id,
        contractId,
        data.amount,
        data.payment_date,
        data.payment_method,
        data.period,
        data.notes ?? null,
        now,
      );

    this.logger.info("Payment created", {
      paymentId: id,
      contractId,
      period: data.period,
    });

    return this.db
      .prepare("SELECT * FROM rental_payments WHERE id = ?")
      .get(id) as RentalPayment;
  }

  /**
   * Lists payments for a contract ordered by period descending.
   */
  listByContract(contractId: string): RentalPayment[] {
    // Validate contract exists
    const contract = this.db
      .prepare("SELECT id FROM rental_contracts WHERE id = ?")
      .get(contractId) as { id: string } | undefined;

    if (!contract) {
      throw new AppError(404, "NOT_FOUND", "Contract not found");
    }

    return this.db
      .prepare(
        "SELECT * FROM rental_payments WHERE contract_id = ? ORDER BY period DESC",
      )
      .all(contractId) as RentalPayment[];
  }
}
