import React from "react";
import { usePricingRules } from "../../hooks";
import { Card } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const PricingRules: React.FC = () => {
  const { rules, loading } = usePricingRules();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.admin.pricingTitle}</h2>
        {rules.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.admin.noPricing}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {rules.map((r) => (
              <Card key={r.id} className="p-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="caption">{translateStatus(r.errand_type)}</p>
                    <p className="font-body text-body-md text-ink mt-xs">
                      Base: ${r.base_rate} · /km: ${r.rate_per_km} · Comisión:{" "}
                      {r.commission_percentage}%
                    </p>
                  </div>
                  <span
                    className={`caption ${r.active ? "text-success" : "text-muted"}`}
                  >
                    {r.active ? t.admin.active : t.admin.inactive}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
