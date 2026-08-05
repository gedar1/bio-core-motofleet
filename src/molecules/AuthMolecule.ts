import Database from "better-sqlite3";
import jsonwebtoken from "jsonwebtoken";
import { verifyPassword } from "../atoms/password.js";
import { ILogger } from "../infrastructure/logger.js";
import { IMolecule, Role, JwtPayload } from "./IMolecule.js";

const jwt = jsonwebtoken as unknown as typeof jsonwebtoken;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * AuthMolecule handles authentication, JWT token management,
 * and login attempt tracking with account lockout.
 */
export class AuthMolecule implements IMolecule {
  readonly name = "auth";
  readonly version = "1.0.0";

  constructor(
    private readonly db: Database.Database,
    private readonly logger: ILogger,
  ) {}

  /**
   * Authenticates an actor by email and password.
   * Searches users, riders, and admins tables.
   * Emits a JWT with role and 24h expiration on success.
   * Returns null with generic error on failure (Requirement 1.2).
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; role: Role } | null> {
    // Check account lockout (Requirement 1.7)
    if (this.isAccountLocked(email)) {
      this.logger.warn("Login attempt on locked account", { email });
      return null;
    }

    // Search for actor across all three tables
    const actor = this.findActorByEmail(email);

    if (!actor) {
      // Increment failed attempts even if email doesn't exist (Requirement 1.2 - generic error)
      this.incrementFailedAttempts(email);
      this.logger.info("Login failed: actor not found", { email });
      return null;
    }

    // Verify password
    const isValid = await verifyPassword(password, actor.passwordHash);

    if (!isValid) {
      this.incrementFailedAttempts(email);
      this.logger.info("Login failed: invalid password", { email });
      return null;
    }

    // Successful login: reset failed attempts (Requirement 1.8)
    this.resetFailedAttempts(email);

    // Emit JWT with role and 24h expiration (Requirement 1.1)
    const secret = process.env.JWT_SECRET || "default-secret-change-me";
    const payload: JwtPayload = {
      id: actor.id,
      role: actor.role,
      email: actor.email,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "24h" });

    this.logger.info("Login successful", { email, role: actor.role });
    return { token, role: actor.role };
  }

  /**
   * Decodes and validates a JWT token.
   * Returns the payload if valid, null otherwise (Requirement 1.4).
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const secret = process.env.JWT_SECRET || "default-secret-change-me";
      const decoded = jwt.verify(token, secret) as JwtPayload & {
        iat: number;
        exp: number;
      };
      return { id: decoded.id, role: decoded.role, email: decoded.email };
    } catch {
      return null;
    }
  }

  /**
   * Returns the number of failed login attempts for an email.
   */
  getFailedAttempts(email: string): number {
    const row = this.db
      .prepare("SELECT failed_count FROM login_attempts WHERE email = ?")
      .get(email) as { failed_count: number } | undefined;

    return row?.failed_count ?? 0;
  }

  /**
   * Increments the failed login attempt counter for an email.
   * If the threshold (5) is reached, locks the account for 15 minutes.
   */
  incrementFailedAttempts(email: string): void {
    const existing = this.db
      .prepare("SELECT failed_count FROM login_attempts WHERE email = ?")
      .get(email) as { failed_count: number } | undefined;

    if (existing) {
      const newCount = existing.failed_count + 1;
      let lockedUntil: string | null = null;

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        const lockTime = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        lockedUntil = lockTime.toISOString();
      }

      this.db
        .prepare(
          `UPDATE login_attempts 
           SET failed_count = ?, locked_until = ?, updated_at = datetime('now') 
           WHERE email = ?`,
        )
        .run(newCount, lockedUntil, email);
    } else {
      this.db
        .prepare(
          `INSERT INTO login_attempts (email, failed_count, locked_until, updated_at) 
           VALUES (?, 1, NULL, datetime('now'))`,
        )
        .run(email);
    }
  }

  /**
   * Resets the failed login attempt counter for an email (Requirement 1.8).
   */
  resetFailedAttempts(email: string): void {
    this.db
      .prepare(
        `UPDATE login_attempts 
         SET failed_count = 0, locked_until = NULL, updated_at = datetime('now') 
         WHERE email = ?`,
      )
      .run(email);
  }

  /**
   * Checks if an account is locked due to too many failed attempts.
   * Account is locked if locked_until is in the future (Requirement 1.7).
   */
  isAccountLocked(email: string): boolean {
    const row = this.db
      .prepare("SELECT locked_until FROM login_attempts WHERE email = ?")
      .get(email) as { locked_until: string | null } | undefined;

    if (!row?.locked_until) {
      return false;
    }

    const lockedUntil = new Date(row.locked_until);
    return lockedUntil > new Date();
  }

  /**
   * Searches for an actor by email across users, riders, and admins tables.
   * Role is determined by which table the email is found in.
   */
  private findActorByEmail(
    email: string,
  ): { id: string; email: string; passwordHash: string; role: Role } | null {
    // Search in users table
    const user = this.db
      .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
      .get(email) as
      | { id: string; email: string; password_hash: string }
      | undefined;

    if (user) {
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        role: "user",
      };
    }

    // Search in riders table
    const rider = this.db
      .prepare("SELECT id, email, password_hash FROM riders WHERE email = ?")
      .get(email) as
      | { id: string; email: string; password_hash: string }
      | undefined;

    if (rider) {
      return {
        id: rider.id,
        email: rider.email,
        passwordHash: rider.password_hash,
        role: "rider",
      };
    }

    // Search in admins table
    const admin = this.db
      .prepare("SELECT id, email, password_hash FROM admins WHERE email = ?")
      .get(email) as
      | { id: string; email: string; password_hash: string }
      | undefined;

    if (admin) {
      return {
        id: admin.id,
        email: admin.email,
        passwordHash: admin.password_hash,
        role: "admin",
      };
    }

    return null;
  }
}
