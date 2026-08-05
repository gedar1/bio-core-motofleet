import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Generates a bcrypt hash of the given plaintext password.
 * Uses 10 salt rounds as specified by design.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Validates password requirements:
 * - Length between 8 and 72 characters (inclusive)
 * - At least one uppercase letter [A-Z]
 * - At least one lowercase letter [a-z]
 * - At least one digit [0-9]
 *
 * Returns true only if ALL conditions are met.
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8 || password.length > 72) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  return hasUppercase && hasLowercase && hasDigit;
}
