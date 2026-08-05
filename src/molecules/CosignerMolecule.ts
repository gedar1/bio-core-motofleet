import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

/**
 * Data required to create a new cosigner.
 */
export interface CreateCosignerInput {
  name: string;
  address: string;
  phone: string;
  relationship: string;
  identity_document: string;
}

/**
 * Data allowed for partial update of a cosigner.
 * All fields are optional — only provided fields will be updated.
 */
export interface UpdateCosignerInput {
  name?: string;
  address?: string;
  phone?: string;
  relationship?: string;
  identity_document?: string;
}

/**
 * Cosigner record as stored in the database.
 */
export interface Cosigner {
  id: string;
  rider_id: string;
  name: string;
  address: string;
  phone: string;
  relationship: string;
  identity_document: string;
  created_at: string;
}

/**
 * Molecule responsible for cosigner management.
 * Handles CRUD operations for cosigners associated with riders.
 * Enforces rider existence and document uniqueness per rider.
 */
export class CosignerMolecule implements IMolecule {
  readonly name = "cosigners";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Creates a new cosigner associated with a rider.
   * Validates that the rider exists and that the identity_document
   * is unique per rider (UNIQUE(rider_id, identity_document)).
   * @throws AppError(404, 'NOT_FOUND') if rider does not exist.
   * @throws AppError(409, 'CONFLICT') if identity_document already exists for this rider.
   */
  create(riderId: string, data: CreateCosignerInput): Cosigner {
    // Validate rider exists
    const rider = this.db
      .prepare("SELECT id FROM riders WHERE id = ?")
      .get(riderId) as { id: string } | undefined;

    if (!rider) {
      throw new AppError(404, "NOT_FOUND", "Rider not found");
    }

    // Check document uniqueness per rider
    const existing = this.db
      .prepare(
        "SELECT id FROM cosigners WHERE rider_id = ? AND identity_document = ?",
      )
      .get(riderId, data.identity_document) as { id: string } | undefined;

    if (existing) {
      throw new AppError(
        409,
        "CONFLICT",
        "Identity document is already registered for this rider",
      );
    }

    const id = uuidv4();

    this.db
      .prepare(
        `INSERT INTO cosigners (id, rider_id, name, address, phone, relationship, identity_document)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        riderId,
        data.name,
        data.address,
        data.phone,
        data.relationship,
        data.identity_document,
      );

    this.logger.info("Cosigner created", { cosignerId: id, riderId });

    return this.getById(id) as Cosigner;
  }

  /**
   * Lists all cosigners for a given rider.
   * Returns an empty array if the rider has no cosigners.
   */
  listByRider(riderId: string): Cosigner[] {
    const rows = this.db
      .prepare("SELECT * FROM cosigners WHERE rider_id = ?")
      .all(riderId) as Cosigner[];

    return rows;
  }

  /**
   * Partially updates a cosigner. Only fields present in the input
   * object (not undefined) are modified; untouched fields are preserved.
   * @throws AppError(404, 'NOT_FOUND') if cosigner does not exist.
   */
  update(cosignerId: string, partialData: UpdateCosignerInput): Cosigner {
    // Verify cosigner exists
    const existing = this.getById(cosignerId);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Cosigner not found");
    }

    // Build SET clause only for fields that are present (not undefined)
    const allowedFields: (keyof UpdateCosignerInput)[] = [
      "name",
      "address",
      "phone",
      "relationship",
      "identity_document",
    ];

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (partialData[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(partialData[field]);
      }
    }

    // If no fields to update, just return existing record
    if (setClauses.length === 0) {
      return existing;
    }

    values.push(cosignerId);

    this.db
      .prepare(`UPDATE cosigners SET ${setClauses.join(", ")} WHERE id = ?`)
      .run(...values);

    this.logger.info("Cosigner updated", {
      cosignerId,
      updatedFields: setClauses.map((c) => c.split(" = ")[0]),
    });

    return this.getById(cosignerId) as Cosigner;
  }

  /**
   * Retrieves a cosigner by its UUID.
   * @returns The cosigner record or null if not found.
   */
  getById(cosignerId: string): Cosigner | null {
    const row = this.db
      .prepare("SELECT * FROM cosigners WHERE id = ?")
      .get(cosignerId) as Cosigner | undefined;

    return row ?? null;
  }
}
