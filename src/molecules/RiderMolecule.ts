import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { RiderDocumentType } from "../atoms/schemas/rider.schemas.js";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { hashPassword } from "../atoms/password.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../domains/errors.js";

/** Data required to register a new rider (motorcyclist). */
export interface CreateRiderInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  document_type: RiderDocumentType;
  document_number: string;
  license_number: string;
  license_expiry: string;
  insurance_number: string;
  insurance_expiry: string;
  bond_amount: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface UpdateRiderInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  license_number?: string;
  license_expiry?: string;
  insurance_number?: string;
  insurance_expiry?: string;
  bond_amount?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

/** Rider record as stored in the database. */
export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password_hash: string;
  document_type: RiderDocumentType | null;
  document_number: string | null;
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

export class RiderMolecule implements IMolecule {
  readonly name = "riders";
  readonly version = "1.0.0";
  readonly description =
    "Rider registration, retrieval, and availability management.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  async register(data: CreateRiderInput): Promise<Rider> {
    const documentType = data.document_type
      .trim()
      .toUpperCase() as RiderDocumentType;
    const documentNumber = data.document_number.trim().toUpperCase();

    const emailInUsers = this.db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(data.email) as { id: string } | undefined;
    if (emailInUsers) {
      throw new ConflictError("Email is already in use");
    }

    const emailInRiders = this.db
      .prepare("SELECT id FROM riders WHERE email = ?")
      .get(data.email) as { id: string } | undefined;
    if (emailInRiders) {
      throw new ConflictError("Email is already in use");
    }

    const phoneInUsers = this.db
      .prepare("SELECT id FROM users WHERE phone = ?")
      .get(data.phone) as { id: string } | undefined;
    if (phoneInUsers) {
      throw new ConflictError("Phone is already in use");
    }

    const phoneInRiders = this.db
      .prepare("SELECT id FROM riders WHERE phone = ?")
      .get(data.phone) as { id: string } | undefined;
    if (phoneInRiders) {
      throw new ConflictError("Phone is already in use");
    }

    const existingDocument = this.db
      .prepare(
        "SELECT id FROM riders WHERE document_type = ? AND document_number = ?",
      )
      .get(documentType, documentNumber) as { id: string } | undefined;
    if (existingDocument) {
      throw new ConflictError("Identity document is already registered");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const licenseDate = new Date(data.license_expiry);
    licenseDate.setHours(0, 0, 0, 0);
    if (licenseDate <= today) {
      throw new ValidationError("License is expired or expires today");
    }

    const insuranceDate = new Date(data.insurance_expiry);
    insuranceDate.setHours(0, 0, 0, 0);
    if (insuranceDate <= today) {
      throw new ValidationError("Insurance is expired or expires today");
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(data.password);
    const stmt = this.db.prepare(`
      INSERT INTO riders (
        id, name, phone, email, address, password_hash, document_type,
        document_number, license_number, license_expiry, insurance_number,
        insurance_expiry, bond_amount, emergency_contact_name,
        emergency_contact_phone, status, available
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
    `);

    try {
      stmt.run(
        id,
        data.name,
        data.phone,
        data.email,
        data.address,
        passwordHash,
        documentType,
        documentNumber,
        data.license_number,
        data.license_expiry,
        data.insurance_number,
        data.insurance_expiry,
        data.bond_amount,
        data.emergency_contact_name,
        data.emergency_contact_phone,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("riders.document_type, riders.document_number")
      ) {
        throw new ConflictError("Identity document is already registered");
      }
      throw error;
    }

    this.logger.info("Rider registered", { riderId: id, email: data.email });
    return this.getById(id) as Rider;
  }

  update(id: string, data: UpdateRiderInput): Rider {
    const existing = this.getById(id);
    if (!existing) {
      throw new NotFoundError("Rider", id);
    }

    if (data.email !== undefined) {
      const emailInUsers = this.db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(data.email) as { id: string } | undefined;
      const emailInRiders = this.db
        .prepare("SELECT id FROM riders WHERE email = ? AND id != ?")
        .get(data.email, id) as { id: string } | undefined;
      if (emailInUsers || emailInRiders) {
        throw new ConflictError("Email is already in use");
      }
    }

    if (data.phone !== undefined) {
      const phoneInUsers = this.db
        .prepare("SELECT id FROM users WHERE phone = ?")
        .get(data.phone) as { id: string } | undefined;
      const phoneInRiders = this.db
        .prepare("SELECT id FROM riders WHERE phone = ? AND id != ?")
        .get(data.phone, id) as { id: string } | undefined;
      if (phoneInUsers || phoneInRiders) {
        throw new ConflictError("Phone is already in use");
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    const editableFields: Array<keyof UpdateRiderInput> = [
      "name",
      "phone",
      "email",
      "address",
      "license_number",
      "license_expiry",
      "insurance_number",
      "insurance_expiry",
      "bond_amount",
      "emergency_contact_name",
      "emergency_contact_phone",
    ];

    for (const field of editableFields) {
      const value = data[field];
      if (value !== undefined) {
        fields.push(`${field} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(id);
    this.db
      .prepare(`UPDATE riders SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values);

    this.logger.info("Rider updated", { riderId: id });
    return this.getById(id) as Rider;
  }

  getById(id: string): Rider | null {
    const row = this.db.prepare("SELECT * FROM riders WHERE id = ?").get(id) as
      | Rider
      | undefined;
    return row ?? null;
  }

  getByEmail(email: string): Rider | null {
    const row = this.db
      .prepare("SELECT * FROM riders WHERE email = ?")
      .get(email) as Rider | undefined;
    return row ?? null;
  }

  setAvailability(riderId: string, available: boolean): void {
    const result = this.db
      .prepare(
        "UPDATE riders SET available = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(available ? 1 : 0, riderId);

    if (result.changes === 0) {
      this.logger.warn("Rider not found for availability update", { riderId });
      return;
    }

    this.logger.info("Rider availability updated", { riderId, available });
  }
}
