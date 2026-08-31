/**
 * Utilidades para manejo de fechas en el backend
 * Todas las fechas se almacenan en UTC en la base de datos
 * El frontend aplica la zona horaria de Colombia (America/Bogota) para visualización
 */

/**
 * Obtiene el timestamp actual en UTC en formato ISO (para almacenar en BD)
 * @returns Fecha en formato ISO completo (ej: 2026-08-31T23:02:18.123Z)
 */
export function getCurrentUtcTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Obtiene el timestamp actual en UTC en formato compatible con SQLite
 * @returns Fecha en formato "YYYY-MM-DD HH:MM:SS" UTC
 */
export function getCurrentUtcTimestampSqlite(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Convierte una fecha a formato ISO UTC
 * @param date - Date object
 * @returns Fecha en formato ISO
 */
export function toUtcIso(date: Date): string {
  return date.toISOString();
}

/**
 * Convierte una fecha a formato SQLite UTC
 * @param date - Date object
 * @returns Fecha en formato "YYYY-MM-DD HH:MM:SS"
 */
export function toUtcSqlite(date: Date): string {
  return date.toISOString().replace("T", " ").substring(0, 19);
}
