import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ILogger } from "../infrastructure/logger.js";
import type { IMolecule } from "./IMolecule.js";
import { hashPassword } from "../atoms/password.js";
import { ConflictError, ValidationError } from "../domains/errors.js";

/**
 * Data required to register a new user.
 */
export interface CreateUserInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  password: string;
}

/**
 * User record as stored in the database.
 */
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password_hash: string;
  status: "active" | "suspended" | "inactive";
  created_at: string;
  updated_at: string;
}

/**
 * Molecule responsible for user registration and retrieval.
 * Validates uniqueness of email and phone, hashes passwords,
 * and interacts with the users table in SQLite.
 */
export class UserMolecule implements IMolecule {
  readonly name = "users";
  readonly version = "1.0.0";
  readonly description =
    "User registration and retrieval with email/phone uniqueness.";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Registers a new user after validating email/phone uniqueness.
   * Hashes the password with bcrypt and assigns a UUID.
   */
  async register(data: CreateUserInput): Promise<User> {
    const existingEmail = this.db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(data.email) as { id: string } | undefined;

    if (existingEmail) {
      throw new ConflictError("Email is already in use");
    }

    const existingPhone = this.db
      .prepare("SELECT id FROM users WHERE phone = ?")
      .get(data.phone) as { id: string } | undefined;

    if (existingPhone) {
      throw new ConflictError("Phone is already in use");
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(data.password);

    const stmt = this.db.prepare(`
      INSERT INTO users (id, name, phone, email, address, password_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);

    stmt.run(id, data.name, data.phone, data.email, data.address, passwordHash);

    this.logger.info("User registered", { userId: id, email: data.email });

    return this.getById(id) as User;
  }

  /**
   * Retrieves a user by their UUID.
   */
  getById(id: string): User | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | User
      | undefined;

    return row ?? null;
  }

  /**
   * Retrieves a user by their email address.
   */
  getByEmail(email: string): User | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as User | undefined;

    return row ?? null;
  }
}
