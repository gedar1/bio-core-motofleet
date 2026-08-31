import React, { useMemo, useState } from "react";
import { useMyErrands, useErrandActions } from "../../hooks";
import { Card, Button, RiderRouteActions } from "../../components/ui";
import { t, translateStatus } from "../../i18n";
import {
  getCurrentDateColombia,
  formatDateColombia,
} from "../../utils/dateFormatter";
import type { Errand } from "../../hooks/useErrands";

type DateRange = "today" | "week" | "all";

const formatCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/**
 * Obtiene la fecha de hoy en zona horaria de Colombia (sin hora)
 */
const getTodayColombia = (): string => {
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

/**
 * Obtiene el inicio de la semana en Colombia (como string YYYY-MM-DD)
 */
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

    // Construir fecha de hoy en Colombia
    const todayStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const today = new Date(todayStr);

    // Calcular inicio de semana (domingo = 0)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Retornar como string YYYY-MM-DD
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

/**
 * Convierte una fecha ISO a fecha de Colombia para comparación
 */
const getDateColombia = (dateStr: string): string => {
  if (!dateStr) return "Sin fecha";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Sin fecha";

    // Usar Intl.DateTimeFormat para obtener la fecha en Colombia
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

const isToday = (dateStr: string): boolean => {
  const today = getTodayColombia();
  const errandDate = getDateColombia(dateStr);
  return errandDate !== "Sin fecha" && errandDate === today;
};

const isThisWeek = (dateStr: string): boolean => {
  const errandDate = getDateColombia(dateStr);
  if (errandDate === "Sin fecha") return false;

  const startOfWeek = getStartOfWeekColombia();
  const today = getTodayColombia();

  // Comparar strings de fecha (YYYY-MM-DD)
  // "Esta semana" incluye desde el inicio de semana hasta hoy
  return errandDate >= startOfWeek && errandDate <= today;
};

const groupByDate = (errands: Errand[]): Map<string, Errand[]> => {
  const groups = new Map<string, Errand[]>();
  for (const errand of errands) {
    // Usar fecha en zona horaria de Colombia
    const dateKey = getDateColombia(errand.requested_at ?? "");
    const group = groups.get(dateKey);
    if (group) group.push(errand);
    else groups.set(dateKey, [errand]);
  }
  return groups;
};

const formatDateLabel = (dateKey: string): string => {
  if (dateKey === "Sin fecha") return dateKey;
  const today = getTodayColombia();
  if (dateKey === today) return "Hoy";
  const yesterday = new Date(new Date().getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  if (dateKey === yesterday) return "Ayer";
  return new Date(dateKey + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
};

export const RiderErrands: React.FC = () => {
  const { errands, loading, refresh } = useMyErrands();
  const { pickup, deliver, cancel } = useErrandActions();
  const [range, setRange] = useState<DateRange>("all");

  const handleAction = async (
    errandId: string,
    action: "pickup" | "deliver" | "cancel",
  ) => {
    try {
      if (action === "pickup") await pickup(errandId);
      else if (action === "deliver") await deliver(errandId);
      else {
        const reason = prompt("Motivo de cancelación (mín. 10 caracteres):");
        if (!reason || reason.length < 10) return;
        await cancel(errandId, reason);
      }
      refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error en la acción");
    }
  };

  const activeErrands = useMemo(
    () =>
      errands.filter(
        (e) => e.status === "accepted" || e.status === "picked_up",
      ),
    [errands],
  );

  const completedErrands = useMemo(() => {
    const finished = errands.filter(
      (e) => e.status === "delivered" || e.status === "cancelled",
    );
    if (range === "today")
      return finished.filter((e) => isToday(e.requested_at));
    if (range === "week")
      return finished.filter((e) => isThisWeek(e.requested_at));
    return finished;
  }, [errands, range]);

  const earnings = useMemo(
    () =>
      completedErrands
        .filter((e) => e.status === "delivered")
        .reduce((sum, e) => sum + (e.rider_earnings ?? 0), 0),
    [completedErrands],
  );

  const groupedCompleted = useMemo(
    () => groupByDate(completedErrands),
    [completedErrands],
  );

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  const activeErrandId = activeErrands[0]?.id;

  return (
    <div className="section-mobile md:section px-0 lg:px-2xl">
      <div className="mx-auto max-w-[1280px]">
        {/* Active errands */}
        {activeErrands.length > 0 && (
          <>
            <h2 className="px-xl mb-lg lg:mb-2xl lg:px-0">Favor activo</h2>
            <div className="mb-2xl flex flex-col gap-lg">
              {activeErrands.map((e) => (
                <Card
                  key={e.id}
                  className="flex flex-col overflow-hidden p-0 lg:p-xl"
                >
                  <RiderRouteActions
                    errand={e}
                    mobileMapFirst
                    autoLoadOnMobile={e.id === activeErrandId}
                    navigationTarget={
                      e.status === "accepted"
                        ? "origin"
                        : e.status === "picked_up"
                          ? "destination"
                          : undefined
                    }
                  />
                  <div className="order-2 z-10 -mt-md flex flex-col gap-md rounded-t-xl bg-canvas px-xl py-2xl shadow-card lg:order-1 lg:mt-0 lg:flex-row lg:items-start lg:justify-between lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
                    <div>
                      <p className="caption">
                        {translateStatus(e.type)} · {translateStatus(e.status)}
                      </p>
                      <p className="font-body text-body-md text-ink mt-xs">
                        {e.description}
                      </p>
                      <p className="font-body text-body-sm text-slate mt-xs">
                        {e.origin_address} → {e.destination_address}
                      </p>
                      <p className="caption mt-sm">
                        {t.rider.earn}: ${e.rider_earnings}
                      </p>
                      {e.pin && (
                        <div className="mt-md p-md bg-warning-50 rounded-lg border border-warning-200">
                          <p className="caption text-warning-800 font-semibold">
                            🔐 PIN de verificación:{" "}
                            <span className="text-lg font-bold tracking-wider">
                              {e.pin}
                            </span>
                          </p>
                          <p className="text-xs text-muted mt-xs">
                            Pide este código al recoger y entregar el paquete
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-sm">
                      {e.status === "accepted" && (
                        <Button onClick={() => handleAction(e.id, "pickup")}>
                          {t.rider.pickup}
                        </Button>
                      )}
                      {e.status === "picked_up" && (
                        <Button onClick={() => handleAction(e.id, "deliver")}>
                          {t.rider.deliver}
                        </Button>
                      )}
                      {(e.status === "accepted" ||
                        e.status === "picked_up") && (
                        <Button
                          variant="secondary"
                          onClick={() => handleAction(e.id, "cancel")}
                        >
                          {t.rider.cancel}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* History */}
        <h2 className="px-xl mb-lg lg:mb-2xl lg:px-0">Historial</h2>

        {/* Range filter */}
        <div className="mb-lg flex gap-sm px-xl lg:px-0">
          {(["today", "week", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={range === r ? "pill-tab-active" : "pill-tab"}
            >
              {r === "today" ? "Hoy" : r === "week" ? "Esta semana" : "Todos"}
            </button>
          ))}
        </div>

        {/* Earnings summary */}
        {completedErrands.length > 0 && (
          <div className="mx-xl mb-lg rounded-md border border-primary bg-cream px-md py-md lg:mx-0">
            <p className="font-body text-body-sm-medium text-ink">
              Ganancias (
              {range === "today"
                ? "hoy"
                : range === "week"
                  ? "semana"
                  : "total"}
              )
            </p>
            <p className="font-body text-heading-3 text-primary">
              {formatCop.format(earnings)}
            </p>
            <p className="caption">
              {completedErrands.filter((e) => e.status === "delivered").length}{" "}
              {completedErrands.filter((e) => e.status === "delivered")
                .length === 1
                ? "favor entregado"
                : "favores entregados"}
            </p>
          </div>
        )}

        {completedErrands.length === 0 ? (
          <p className="px-xl text-muted font-body text-body-md lg:px-0">
            {range === "today"
              ? "No hay favores completados hoy."
              : range === "week"
                ? "No hay favores completados esta semana."
                : t.rider.noAssigned}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {Array.from(groupedCompleted.entries()).map(
              ([dateKey, dateErrands]) => (
                <div key={dateKey}>
                  <p className="caption px-xl mb-sm lg:px-0">
                    {formatDateLabel(dateKey)}
                  </p>
                  <div className="flex flex-col gap-md">
                    {dateErrands.map((e) => (
                      <Card key={e.id} className="mx-xl lg:mx-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="caption">
                              {translateStatus(e.type)} ·{" "}
                              {translateStatus(e.status)}
                            </p>
                            <p className="font-body text-body-md text-ink mt-xs">
                              {e.description}
                            </p>
                            <p className="font-body text-body-sm text-slate mt-xs">
                              {e.origin_address} → {e.destination_address}
                            </p>
                            <p className="caption text-muted mt-sm">
                              📅{" "}
                              {formatDateColombia(e.requested_at, {
                                showSeconds: false,
                              })}
                            </p>
                          </div>
                          <p className="font-body text-body-sm-medium text-primary whitespace-nowrap">
                            {e.status === "delivered"
                              ? formatCop.format(e.rider_earnings ?? 0)
                              : "—"}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
};
