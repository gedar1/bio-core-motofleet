import React from "react";
import { Link } from "react-router-dom";
import { usePricingRules } from "../../../hooks";
import { Card, Button } from "../../../components/ui";
import { t, translateStatus } from "../../../i18n";
import { formatDateColombia } from "../../../utils/dateFormatter";
import { Icon } from "@/components/shared/components/Icon";

const formatCop = (amount: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);

export const PricingRules: React.FC = () => {
  const { rules, loading } = usePricingRules();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section lg:px-2xl px-md">
      <div className="w-full">
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
            {rules.map((rule) => (
              <Card key={rule.id} className="p-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="caption">
                      {translateStatus(rule.errand_type)}
                    </p>
                    <p className="font-body text-body-md text-ink mt-xs">
                      Bello: {formatCop(rule.inside_bello_flat_fare_cop)} fijo ·
                      Fuera de Bello: mínimo{" "}
                      {formatCop(rule.outside_minimum_fare_cop)}
                    </p>
                    <p className="caption text-slate mt-xxs">
                      Fórmula exterior: {formatCop(rule.base_rate)} +{" "}
                      {formatCop(rule.rate_per_km)}/km · Comisión:{" "}
                      {rule.commission_percentage}%
                    </p>
                    <p className="caption text-slate mt-sm">
                      Creado: {formatDateColombia(rule.created_at)} ·
                      Actualizado: {formatDateColombia(rule.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-start gap-lg">
                    <span
                      className={`caption ${rule.active ? "text-success" : "text-muted"}`}
                    >
                      {rule.active ? t.admin.active : t.admin.inactive}
                    </span>
                    <Link
                      to={`/admin?tab=pricing&mode=edit&id=${rule.id}`}
                      className="whitespace-nowrap font-body text-body-sm-medium text-primary hover:underline"
                    >
                      <Icon name="squarePen" size={18} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
