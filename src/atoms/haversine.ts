/**
 * Calcula la distancia en km entre dos puntos geográficos usando la fórmula de Haversine.
 * Retorna un valor con 2 decimales, mínimo 0.5 km.
 *
 * Propiedades:
 * - result ≥ 0.5 km siempre
 * - Simétrica: haversineDistance(A, B) === haversineDistance(B, A)
 * - Desigualdad triangular para distancias ≥ 0.5
 */

const EARTH_RADIUS_KM = 6371;
const MINIMUM_DISTANCE_KM = 0.5;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): number {
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);

  const originLatRad = toRadians(origin.lat);
  const destLatRad = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originLatRad) *
      Math.cos(destLatRad) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;

  // Round to 2 decimal places
  const rounded = Math.round(distance * 100) / 100;

  // Apply minimum floor of 0.5 km
  return Math.max(rounded, MINIMUM_DISTANCE_KM);
}
