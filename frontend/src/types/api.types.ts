export type Role = "admin" | "rider" | "user";
export type MotorcycleStatus =
  | "disponible"
  | "rentada"
  | "mantenimiento"
  | "retirada";
export type ContractStatus = "activo" | "vencido" | "renovado" | "cancelado";
export type ErrandStatus =
  | "solicitado"
  | "aceptado"
  | "recogido"
  | "entregado"
  | "cancelado";
export type ErrandType = "transporte_objetos" | "compra" | "tramite";
export type PaymentMethod = "efectivo" | "transferencia";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}
