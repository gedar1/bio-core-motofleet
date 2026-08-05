import React from "react";
import { useMetrics } from "../../hooks";
import { Card } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const Metrics: React.FC = () => {
  const { metrics, loading } = useMetrics();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;
  if (!metrics)
    return <p className="text-muted text-center">{t.common.failedLoad}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.admin.metricsTitle}</h2>

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
