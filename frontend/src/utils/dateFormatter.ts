/**
 * Formatea una fecha al zona horaria de Colombia (UTC-5)
 * @param dateString - Fecha en formato ISO o string
 * @param options - Opciones adicionales de formato
 * @returns Fecha formateada en hora de Colombia
 */
export function formatDateColombia(
  dateString: string | null,
  options?: {
    showTime?: boolean;
    showSeconds?: boolean;
  },
): string {
  if (!dateString) return "—";

  try {
    const date = new Date(dateString);

    // Opciones por defecto
    const showTime = options?.showTime ?? true;
    const showSeconds = options?.showSeconds ?? true;

    // Locale es-CO usa automáticamente la zona horaria del navegador
    // Para asegurar que sea Colombia, especificamos timeZone
    const formatter = new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(showTime && {
        hour: "2-digit",
        minute: "2-digit",
        ...(showSeconds && { second: "2-digit" }),
      }),
      timeZone: "America/Bogota", // Zona horaria de Colombia
    });

    return formatter.format(date);
  } catch {
    return "—";
  }
}

/**
 * Obtiene la fecha actual en zona horaria de Colombia
 * @returns Objeto Date ajustado a la zona horaria de Colombia (YYYY-MM-DD format)
 */
export function getCurrentDateColombia(): Date {
  const now = new Date();

  // Usar Intl para obtener partes de la fecha en Colombia
  const formatter = new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Bogota",
  });

  // Obtener las partes
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = part.value;
    }
  }

  // Construir una fecha válida
  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  const hour = partMap.hour;
  const minute = partMap.minute;
  const second = partMap.second;

  // Crear string ISO válido
  const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  return new Date(isoString);
}

/**
 * Formatea una fecha de forma corta (solo fecha, sin hora)
 * @param dateString - Fecha en formato ISO o string
 * @returns Fecha formateada (ej: 28/08/2026)
 */
export function formatDateShort(dateString: string | null): string {
  if (!dateString) return "—";

  try {
    const formatter = new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Bogota",
    });

    return formatter.format(new Date(dateString));
  } catch {
    return "—";
  }
}

/**
 * Formatea una fecha de forma larga (ej: 28 de agosto de 2026, 14:30)
 * @param dateString - Fecha en formato ISO o string
 * @returns Fecha formateada con nombres completos
 */
export function formatDateLong(dateString: string | null): string {
  if (!dateString) return "—";

  try {
    const formatter = new Intl.DateTimeFormat("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Bogota",
    });

    return formatter.format(new Date(dateString));
  } catch {
    return "—";
  }
}
