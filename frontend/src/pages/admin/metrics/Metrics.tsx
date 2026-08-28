import React, { useState } from "react";
import { useMetrics, type PeriodType } from "../../../hooks";
import { Card, Button } from "../../../components/ui";
import { t, translateStatus } from "../../../i18n";

export const Metrics: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>("monthly");
  const { metrics, loading, refresh } = useMetrics(period);

  const handlePeriodChange = async (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    // Refresh with the new period
    await refresh(newPeriod);
  };

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;
  if (!metrics)
    return <p className="text-muted text-center">{t.common.failedLoad}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-2xl">
          <h2>{t.admin.metricsTitle}</h2>
          <div className="flex gap-md">
            <Button
              type="button"
              variant={period === "daily" ? "primary" : "secondary"}
              onClick={() => handlePeriodChange("daily")}
            >
              Hoy
            </Button>
            <Button
              type="button"
              variant={period === "weekly" ? "primary" : "secondary"}
              onClick={() => handlePeriodChange("weekly")}
            >
              Semana
            </Button>
            <Button
              type="button"
              variant={period === "monthly" ? "primary" : "secondary"}
              onClick={() => handlePeriodChange("monthly")}
            >
              Mes
            </Button>
          </div>
        </div>

        {metrics.period && (
          <p className="caption text-slate mb-2xl">
            Período: {metrics.period.start_date} a {metrics.period.end_date}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl mb-2xl">
          <Card className="p-xl text-center">
            <p className="font-display text-stat text-ink">
              ${metrics.commission_total?.toLocaleString() || 0}
            </p>
            <p className="caption mt-sm">{t.admin.commissionRevenue}</p>
          </Card>
          <Card className="p-xl text-center">
            <p className="font-display text-stat text-ink">
              ${metrics.rental_payments_total?.toLocaleString() || 0}
            </p>
            <p className="caption mt-sm">{t.admin.rentalPayments}</p>
          </Card>
        </div>

        <h3 className="mb-lg">{t.admin.errandsByStatus}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-lg mb-2xl">
          {metrics.errands_by_status?.map((item) => (
            <Card key={item.status} className="p-xl text-center">
              <p className="font-display text-heading-2 text-ink">
                {item.count}
              </p>
              <p className="caption mt-xs">{translateStatus(item.status)}</p>
            </Card>
          ))}
        </div>

        <h3 className="mb-lg">{t.admin.motorcyclesByStatus}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-lg mb-2xl">
          {metrics.motorcycles_by_status?.map((item) => (
            <Card key={item.status} className="p-xl text-center">
              <p className="font-display text-heading-2 text-ink">
                {item.count}
              </p>
              <p className="caption mt-xs">{translateStatus(item.status)}</p>
            </Card>
          ))}
        </div>

        <h3 className="mb-lg">{t.admin.contractsByStatus}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
          {metrics.contracts_by_status?.map((item) => (
            <Card key={item.status} className="p-xl text-center">
              <p className="font-display text-heading-2 text-ink">
                {item.count}
              </p>
              <p className="caption mt-xs">{translateStatus(item.status)}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
