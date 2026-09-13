import type { Errand } from "../../../hooks/useErrands";

/** Obtiene la fecha de hoy en zona horaria de Colombia (sin hora). */
export const getTodayColombia = (): string => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Bogota",
    });

    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        partMap[part.type] = part.value;
      }
    }

    return `${partMap.year}-${partMap.month}-${partMap.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

/** Obtiene el inicio de la semana en Colombia (como string YYYY-MM-DD). */
const getStartOfWeekColombia = (): string => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Bogota",
    });

    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        partMap[part.type] = part.value;
      }
    }

    const todayStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const today = new Date(todayStr);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, "0");
    const day = String(startOfWeek.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, "0");
    const day = String(startOfWeek.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
};

/** Convierte una fecha ISO a fecha de Colombia para comparación. */
export const getDateColombia = (dateStr: string): string => {
  if (!dateStr) return "Sin fecha";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Sin fecha";

    const formatter = new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Bogota",
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        partMap[part.type] = part.value;
      }
    }

    return `${partMap.year}-${partMap.month}-${partMap.day}`;
  } catch {
    return "Sin fecha";
  }
};

export const isToday = (dateStr: string): boolean => {
  const today = getTodayColombia();
  const errandDate = getDateColombia(dateStr);
  return errandDate !== "Sin fecha" && errandDate === today;
};

export const isThisWeek = (dateStr: string): boolean => {
  const errandDate = getDateColombia(dateStr);
  if (errandDate === "Sin fecha") return false;

  const startOfWeek = getStartOfWeekColombia();
  const today = getTodayColombia();

  return errandDate >= startOfWeek && errandDate <= today;
};

export const groupByDate = (errands: Errand[]): Map<string, Errand[]> => {
  const groups = new Map<string, Errand[]>();
  for (const errand of errands) {
    const dateKey = getDateColombia(errand.requested_at ?? "");
    const group = groups.get(dateKey);
    if (group) group.push(errand);
    else groups.set(dateKey, [errand]);
  }
  return groups;
};

export const formatDateLabel = (dateKey: string): string => {
  if (dateKey === "Sin fecha") return dateKey;
  const today = getTodayColombia();
  if (dateKey === today) return "Hoy";
  const yesterday = new Date(new Date().getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  if (dateKey === yesterday) return "Ayer";
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
};
