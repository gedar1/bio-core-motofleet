import React from "react";
import { Link } from "react-router-dom";
import { usePricingRules } from "../../../hooks";
import { Card, Button } from "../../../components/ui";
import { t, translateStatus } from "../../../i18n";

const formatCop = (amount: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);

// Función para formatear fechas
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
};

export const PricingRules: React.FC = () => {
  const { rules, loading } = usePricingRules();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section lg:px-2xl px-md">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-2xl">
          <h3>{t.admin.pricingTitle}</h3>
          <Link to="/admin/pricing/create">
            <Button>{t.adminForms.crear}</Button>
          </Link>
        </div>
        {rules.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.admin.noPricing}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {rules.map((r) => (
              <Card key={r.id} className="p-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="caption">{translateStatus(r.errand_type)}</p>
                    <p className="font-body text-body-md text-ink mt-xs">
                      Base: {formatCop(r.base_rate)} · /km:{" "}
                      {formatCop(r.rate_per_km)} · Comisión:{" "}
                      {r.commission_percentage}%
                    </p>
                    <p className="caption text-slate mt-sm">
                      Creado: {formatDate(r.created_at)} · Actualizado:{" "}
                      {formatDate(r.updated_at)}
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
