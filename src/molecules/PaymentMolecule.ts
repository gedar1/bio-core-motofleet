import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../domains/errors.js";

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

export class PaymentMolecule implements IMolecule {
  readonly name = "payments";
  readonly version = "1.0.0";
  readonly description = "Rental payment creation and listing by contract.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  create(contractId: string, data: CreatePaymentInput): RentalPayment {
    const contract = this.db
      .prepare("SELECT id FROM rental_contracts WHERE id = ?")
      .get(contractId) as { id: string } | undefined;

    if (!contract) {
      throw new NotFoundError("Contract", contractId);
    }

    if (data.amount <= 0) {
      throw new ValidationError("Amount must be greater than zero");
    }

    const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!periodRegex.test(data.period)) {
      throw new ValidationError("Period must have format YYYY-MM");
    }

    const paymentDate = new Date(data.payment_date);
    if (Number.isNaN(paymentDate.getTime())) {
      throw new ValidationError("Invalid payment date");
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (paymentDate > today) {
      throw new ValidationError("Payment date cannot be a future date");
    }

    if (!["cash", "transfer"].includes(data.payment_method)) {
      throw new ValidationError("Payment method must be cash or transfer");
    }

    const existingPayment = this.db
      .prepare(
        "SELECT id FROM rental_payments WHERE contract_id = ? AND period = ?",
      )
      .get(contractId, data.period) as { id: string } | undefined;

    if (existingPayment) {
      throw new ConflictError("Period already has a registered payment");
    }

    const id = uuidv4();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    this.db
      .prepare(
        `INSERT INTO rental_payments (id, contract_id, amount, payment_date, payment_method, period, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

  listByContract(contractId: string): RentalPayment[] {
    const contract = this.db
      .prepare("SELECT id FROM rental_contracts WHERE id = ?")
      .get(contractId) as { id: string } | undefined;

    if (!contract) {
      throw new NotFoundError("Contract", contractId);
    }

    return this.db
      .prepare(
        "SELECT * FROM rental_payments WHERE contract_id = ? ORDER BY period DESC",
      )
      .all(contractId) as RentalPayment[];
  }
}
