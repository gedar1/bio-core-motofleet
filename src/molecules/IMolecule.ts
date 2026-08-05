/**
 * Convención ligera para módulos de negocio — definida localmente.
 * Cada molecule implementa esta interfaz para organización consistente.
 */
export interface IMolecule {
  readonly name: string;
  readonly version: string;
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
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
