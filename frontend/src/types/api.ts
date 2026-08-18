/** Roles de la plataforma */
export type Role = "admin" | "rider" | "user";

/** Estados de motocicleta */
export type MotorcycleState =
  | "disponible"
  | "rentada"
  | "mantenimiento"
  | "retirada";

/** Estados de contrato */
export type ContractState = "activo" | "vencido" | "renovado" | "cancelado";

/** Estados de mandado */
export type ErrandState =
  | "solicitado"
  | "aceptado"
  | "recogido"
  | "entregado"
  | "cancelado";

/** Tipos de mandado */
export type ErrandType = "transporte_objetos" | "compra" | "tramite";

/** Métodos de pago */
export type PaymentMethod = "efectivo" | "transferencia";

/** Resultado paginado genérico */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** JWT payload decodificado */
export interface JwtPayload {
  id: string;
  role: Role;
  email: string;
  iat: number;
  exp: number;
}

/** Respuesta de login */
export interface LoginResponse {
  token: string;
  role: Role;
}

/** Respuesta de error de la API */
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export interface RouteEstimateRequest {
  origin: RouteCoordinates;
  destination: RouteCoordinates;
}

/** Safe route preview returned by the backend; it never includes a fare. */
export interface RouteEstimateResponse {
  distanceKm: number;
  durationMinutes: number;
  geometry: {
    type: "LineString";
    coordinates: Array<[longitude: number, latitude: number]>;
  };
  provider: "mapbox";
  profile: "driving-traffic";
}

export interface RouteCoordinates {
  latitude: number;
  longitude: number;
}

export interface QuoteErrandRequest extends RouteEstimateRequest {
  type: "object_transport" | "purchase" | "errand";
}

/** A short-lived, server-authoritative amount the user approves before creation. */
export interface ErrandQuoteResponse extends RouteEstimateResponse {
  quoteId: string;
  currency: "COP";
  fareCop: number;
  platformCommissionCop: number;
  riderEarningsCop: number;
  expiresAt: string;
}

/** Usuario */
export interface User {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: "activo" | "suspendido" | "inactivo";
  created_at: string;
}

/** Motociclista */
export interface Rider {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  /** Null for riders created before identity documents became mandatory. */
  document_type: "CC" | "CE" | "PPT" | "PASAPORTE" | null;
  licencia_numero: string;
  licencia_vencimiento: string;
  seguro_numero: string;
  seguro_vencimiento: string;
  fianza: number;
  contacto_emergencia_nombre: string;
  contacto_emergencia_telefono: string;
  estado: "activo" | "suspendido" | "inactivo";
  disponible: boolean;
  created_at: string;
}

/** Motocicleta */
export interface Motorcycle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  cilindraje: number;
  soat_vencimiento: string;
  tecnomecanica_vencimiento: string;
  estado: MotorcycleState;
  created_at: string;
  updated_at: string;
}

/** Contrato de renta */
export interface RentalContract {
  id: string;
  rider_id: string;
  motorcycle_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto_mensual: number;
  dia_pago: number;
  estado: ContractState;
  notas?: string;
  created_at: string;
  updated_at: string;
}

/** Pago de renta */
export interface RentalPayment {
  id: string;
  contract_id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: PaymentMethod;
  periodo: string;
  notas?: string;
  created_at: string;
}

/** Regla de tarifa */
export interface PricingRule {
  id: string;
  tipo_mandado: ErrandType;
  tarifa_base: number;
  tarifa_por_km: number;
  comision_porcentaje: number;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

/** Mandado */
export interface Errand {
  id: string;
  user_id: string;
  rider_id?: string;
  tipo: ErrandType;
  descripcion: string;
  origen_direccion: string;
  origen_lat?: number;
  origen_lng?: number;
  destino_direccion: string;
  destino_lat?: number;
  destino_lng?: number;
  distancia_estimada?: number;
  tarifa: number;
  comision_plataforma: number;
  ganancia_rider: number;
  estado: ErrandState;
  metodo_pago: PaymentMethod;
  motivo_cancelacion?: string;
  solicitado_at: string;
  aceptado_at?: string;
  recogido_at?: string;
  entregado_at?: string;
  cancelado_at?: string;
}

/** Codeudor */
export interface Cosigner {
  id: string;
  rider_id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  relacion: string;
  documento_identidad: string;
  created_at: string;
}

/** Métricas del admin */
export interface AdminMetrics {
  errands_by_status: Record<ErrandState, number>;
  commission_total: number;
  motorcycles_by_status: Record<MotorcycleState, number>;
  contracts_by_status: Record<ContractState, number>;
  rental_payments_total: number;
}
