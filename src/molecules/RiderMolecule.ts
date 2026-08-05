import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { hashPassword } from "../atoms/password.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

/**
 * Data required to register a new rider (motorcyclist).
 */
export interface CreateRiderInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  license_number: string;
  license_expiry: string;
  insurance_number: string;
  insurance_expiry: string;
  bond_amount: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

/**
 * Rider record as stored in the database.
 */
export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password_hash: string;
  license_number: string;
  license_expiry: string;
  insurance_number: string;
  insurance_expiry: string;
  bond_amount: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  status: "active" | "suspended" | "inactive";
  available: number;
  created_at: string;
  updated_at: string;
}

/**
 * Molecule responsible for rider registration, retrieval, and availability management.
 * Validates uniqueness of email/phone across BOTH users AND riders tables,
 * validates license/insurance expiry dates, hashes passwords,
 * and interacts with the riders table in SQLite.
 */
export class RiderMolecule implements IMolecule {
  readonly name = "riders";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Registers a new rider after validating cross-table email/phone uniqueness
   * and verifying that license and insurance dates are in the future.
   * Hashes the password with bcrypt and assigns a UUID.
   * @throws AppError(409, 'CONFLICT') if email or phone already exists in users or riders.
   * @throws AppError(400, 'VALIDATION_ERROR') if license or insurance date is not future.
   */
  async register(data: CreateRiderInput): Promise<Rider> {
    // Cross-table email uniqueness check (users + riders)
    const emailInUsers = this.db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(data.email) as { id: string } | undefined;

    if (emailInUsers) {
      throw new AppError(409, "CONFLICT", "Email is already in use");
    }

    const emailInRiders = this.db
      .prepare("SELECT id FROM riders WHERE email = ?")
      .get(data.email) as { id: string } | undefined;

    if (emailInRiders) {
      throw new AppError(409, "CONFLICT", "Email is already in use");
    }

    // Cross-table phone uniqueness check (users + riders)
    const phoneInUsers = this.db
      .prepare("SELECT id FROM users WHERE phone = ?")
      .get(data.phone) as { id: string } | undefined;

    if (phoneInUsers) {
      throw new AppError(409, "CONFLICT", "Phone is already in use");
    }

    const phoneInRiders = this.db
      .prepare("SELECT id FROM riders WHERE phone = ?")
      .get(data.phone) as { id: string } | undefined;

    if (phoneInRiders) {
      throw new AppError(409, "CONFLICT", "Phone is already in use");
    }

    // Validate license expiry date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const licenseDate = new Date(data.license_expiry);
    licenseDate.setHours(0, 0, 0, 0);

    if (licenseDate <= today) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "License is expired or expires today",
      );
    }

    // Validate insurance expiry date is in the future
    const insuranceDate = new Date(data.insurance_expiry);
    insuranceDate.setHours(0, 0, 0, 0);

    if (insuranceDate <= today) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Insurance is expired or expires today",
      );
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(data.password);

    const stmt = this.db.prepare(`
      INSERT INTO riders (id, name, phone, email, address, password_hash, license_number, license_expiry, insurance_number, insurance_expiry, bond_amount, emergency_contact_name, emergency_contact_phone, status, available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
    `);

    stmt.run(
      id,
      data.name,
      data.phone,
      data.email,
      data.address,
      passwordHash,
      data.license_number,
      data.license_expiry,
      data.insurance_number,
      data.insurance_expiry,
      data.bond_amount,
      data.emergency_contact_name,
      data.emergency_contact_phone,
    );

    this.logger.info("Rider registered", { riderId: id, email: data.email });

    return this.getById(id) as Rider;
  }

  /**
   * Retrieves a rider by their UUID.
   * @returns The rider record or null if not found.
   */
  getById(id: string): Rider | null {
    const row = this.db.prepare("SELECT * FROM riders WHERE id = ?").get(id) as
      | Rider
      | undefined;

    return row ?? null;
  }

  /**
   * Retrieves a rider by their email address.
   * @returns The rider record or null if not found.
   */
  getByEmail(email: string): Rider | null {
    const row = this.db
      .prepare("SELECT * FROM riders WHERE email = ?")
      .get(email) as Rider | undefined;

    return row ?? null;
  }

  /**
   * Updates the availability status of a rider.
   * Sets available to 1 (true) or 0 (false).
   */
  setAvailability(riderId: string, available: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE riders SET available = ?, updated_at = datetime('now') WHERE id = ?
    `);

    const result = stmt.run(available ? 1 : 0, riderId);

    if (result.changes === 0) {
      this.logger.warn("Rider not found for availability update", { riderId });
    } else {
      this.logger.info("Rider availability updated", {
        riderId,
        available,
      });
    }
  }
}
