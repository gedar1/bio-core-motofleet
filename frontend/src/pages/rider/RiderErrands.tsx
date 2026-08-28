import React, { useMemo, useState } from "react";
import { useMyErrands, useErrandActions } from "../../hooks";
import { Card, Button, RiderRouteActions } from "../../components/ui";
import { t, translateStatus } from "../../i18n";
import type { Errand } from "../../hooks/useErrands";

type DateRange = "today" | "week" | "all";

const formatCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const isToday = (dateStr: string): boolean => {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
};

const isThisWeek = (dateStr: string): boolean => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const target = new Date(dateStr.replace(" ", "T"));
  return target >= startOfWeek;
};

const groupByDate = (errands: Errand[]): Map<string, Errand[]> => {
  const groups = new Map<string, Errand[]>();
  for (const errand of errands) {
    const dateKey = (errand.requested_at ?? "").slice(0, 10) || "Sin fecha";
    const group = groups.get(dateKey);
    if (group) group.push(errand);
    else groups.set(dateKey, [errand]);
  }
  return groups;
};

const formatDateLabel = (dateKey: string): string => {
  if (dateKey === "Sin fecha") return dateKey;
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey === today) return "Hoy";
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
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
