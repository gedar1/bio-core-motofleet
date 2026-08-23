/**
 * Base contract for all business-logic modules (molecules).
 *
 * Every molecule MUST implement this interface. TypeScript will error if
 * a concrete class declares `implements IMolecule` without satisfying
 * all required members.
 */
export interface IMolecule {
  /** Stable machine-readable identifier (e.g. "errands", "contracts"). */
  readonly name: string;

  /** SemVer version of the module's public contract. */
  readonly version: string;

  /** One-line human-readable description of this module's responsibility. */
  readonly description: string;
}

/**
 * Roles del sistema: admin (gestión), rider (motociclista), user (solicita mandados).
 */
export type Role = "admin" | "rider" | "user";

/**
 * Resultado paginado genérico para listados.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Payload decodificado del JWT.
 */
export interface JwtPayload {
  id: string;
  role: Role;
  email: string;
}
