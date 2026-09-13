import { useMemo, useState } from "react";
import { Card } from "../../../components/ui";
import type { Errand } from "../../../hooks/useErrands";
import { t, translateStatus } from "../../../i18n";
import { formatDateColombia } from "../../../utils/dateFormatter";
import {
  formatDateLabel,
  groupByDate,
  isThisWeek,
  isToday,
} from "../utils/riderHistoryDates";

type DateRange = "today" | "week" | "all";

type RiderErrandHistoryProps = {
  readonly errands: Errand[];
};

const formatCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const RiderErrandHistory = ({ errands }: RiderErrandHistoryProps) => {
  const [range, setRange] = useState<DateRange>("all");

  const completedErrands = useMemo(() => {
    const finished = errands.filter(
      (errand) =>
        errand.status === "delivered" || errand.status === "cancelled",
    );
    if (range === "today") {
      return finished.filter((errand) => isToday(errand.requested_at));
    }
    if (range === "week") {
      return finished.filter((errand) => isThisWeek(errand.requested_at));
    }
    return finished;
  }, [errands, range]);

  const earnings = useMemo(
    () =>
      completedErrands
        .filter((errand) => errand.status === "delivered")
        .reduce((sum, errand) => sum + (errand.rider_earnings ?? 0), 0),
    [completedErrands],
  );

  const groupedCompleted = useMemo(
    () => groupByDate(completedErrands),
    [completedErrands],
  );
  const deliveredCount = completedErrands.filter(
    (errand) => errand.status === "delivered",
  ).length;

  return (
    <>
      <h2 className="px-xl mb-lg lg:mb-2xl lg:px-0">Historial</h2>

      <div className="mb-lg flex justify-between gap-sm px-xl lg:px-0">
        {(["today", "week", "all"] as const).map((nextRange) => (
          <button
            key={nextRange}
            type="button"
            onClick={() => setRange(nextRange)}
            className={range === nextRange ? "pill-tab-active" : "pill-tab"}
          >
            {nextRange === "today"
              ? "Hoy"
              : nextRange === "week"
                ? "Esta semana"
                : "Todos"}
          </button>
        ))}
      </div>

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
            {deliveredCount}{" "}
            {deliveredCount === 1 ? "favor entregado" : "favores entregados"}
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
                  {dateErrands.map((errand) => (
                    <Card key={errand.id} className="mx-xl lg:mx-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="caption">
                            {translateStatus(errand.type)} ·{" "}
                            {translateStatus(errand.status)}
                          </p>
                          <p className="font-body text-body-md text-ink mt-xs">
                            {errand.description}
                          </p>
                          <p className="font-body text-body-sm text-slate mt-xs">
                            {errand.origin_address} → {errand.destination_address}
                          </p>
                          <p className="caption text-muted mt-sm">
                            📅{" "}
                            {formatDateColombia(errand.requested_at, {
                              showSeconds: false,
                            })}
                          </p>
                        </div>
                        <p className="font-body text-body-sm-medium text-primary whitespace-nowrap">
                          {errand.status === "delivered"
                            ? formatCop.format(errand.rider_earnings ?? 0)
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
    </>
  );
};
