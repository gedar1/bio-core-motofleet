import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { ConflictError, NotFoundError } from "../domains/errors.js";

export interface CreateCosignerInput {
  name: string;
  address: string;
  phone: string;
  relationship: string;
  identity_document: string;
}

export interface UpdateCosignerInput {
  name?: string;
  address?: string;
  phone?: string;
  relationship?: string;
  identity_document?: string;
}

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

export class CosignerMolecule implements IMolecule {
  readonly name = "cosigners";
  readonly version = "1.0.0";
  readonly description = "CRUD for cosigners associated with riders.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  create(riderId: string, data: CreateCosignerInput): Cosigner {
    const rider = this.db
      .prepare("SELECT id FROM riders WHERE id = ?")
      .get(riderId) as { id: string } | undefined;

    if (!rider) {
      throw new NotFoundError("Rider", riderId);
    }

    const existing = this.db
      .prepare(
        "SELECT id FROM cosigners WHERE rider_id = ? AND identity_document = ?",
      )
      .get(riderId, data.identity_document) as { id: string } | undefined;

    if (existing) {
      throw new ConflictError(
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

  listByRider(riderId: string): Cosigner[] {
    return this.db
      .prepare("SELECT * FROM cosigners WHERE rider_id = ?")
      .all(riderId) as Cosigner[];
  }

  update(cosignerId: string, partialData: UpdateCosignerInput): Cosigner {
    const existing = this.getById(cosignerId);
    if (!existing) {
      throw new NotFoundError("Cosigner", cosignerId);
    }

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

  getById(cosignerId: string): Cosigner | null {
    const row = this.db
      .prepare("SELECT * FROM cosigners WHERE id = ?")
      .get(cosignerId) as Cosigner | undefined;

    return row ?? null;
  }
}
