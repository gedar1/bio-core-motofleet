import React, { useState } from "react";
import { useAdminErrands, type PeriodFilterType } from "../../../hooks";
import type { Errand } from "../../../hooks/useErrands";
import { Table, type TableColumn } from "../../../components/shared";
import { Button } from "../../../components/ui";
import { t, translateStatus } from "../../../i18n";
import { formatDateColombia } from "../../../utils/dateFormatter";

const statusBadgeClass: Record<string, string> = {
  requested: "badge-requested",
  accepted: "badge-accepted",
  picked_up: "badge-picked-up",
  delivered: "badge-delivered",
  cancelled: "badge-cancelled",
};

const errandColumns: readonly TableColumn<Errand>[] = [
  {
    id: "type",
    header: "Tipo",
    render: (errand) => (
      <span className="caption">{translateStatus(errand.type)}</span>
    ),
  },
  {
    id: "status",
    header: "Estado",
    render: (errand) => (
      <span className={statusBadgeClass[errand.status]}>
        {translateStatus(errand.status)}
      </span>
    ),
  },
  {
    id: "description",
    header: "Descripción",
    render: (errand) => errand.description,
  },
  {
    id: "route",
    header: "Ruta",
    render: (errand) =>
      `${errand.origin_address} → ${errand.destination_address}`,
  },
  {
    id: "rider",
    header: "Rider",
    render: (errand) => errand.rider_name ?? "—",
  },
  {
    id: "motorcycle",
    header: "Motocicleta",
    render: (errand) => errand.motorcycle_plate ?? "—",
  },
  {
    id: "fare",
    header: "Tarifa",
    render: (errand) => (
      <span className="font-display text-heading-5 text-ink">
        ${errand.fare.toLocaleString()}
      </span>
    ),
  },
  {
    id: "requested_at",
    header: "Solicitado",
    render: (errand) => (
      <span className="caption">{formatDateColombia(errand.requested_at)}</span>
    ),
  },
  {
    id: "accepted_at",
    header: "Aceptado",
    render: (errand) => (
      <span className="caption">{formatDateColombia(errand.accepted_at)}</span>
    ),
  },
  {
    id: "picked_up_at",
    header: "Recogido",
    render: (errand) => (
      <span className="caption">{formatDateColombia(errand.picked_up_at)}</span>
    ),
  },
  {
    id: "delivered_at",
    header: "Entregado",
    render: (errand) => (
      <span className="caption">{formatDateColombia(errand.delivered_at)}</span>
    ),
  },
  {
    id: "cancelled_at",
    header: "Cancelado",
    render: (errand) => (
      <span className="caption">{formatDateColombia(errand.cancelled_at)}</span>
    ),
  },
];

export const AdminErrands: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilterType>("all");
  const { errands, loading, refresh } = useAdminErrands(period);

  const handlePeriodChange = async (newPeriod: PeriodFilterType) => {
    setPeriod(newPeriod);
    await refresh(newPeriod);
  };

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section lg:px-2xl px-md">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col md:flex-row gap-lg md:gap-0 justify-between items-center mb-2xl">
          <h3>{t.admin.errandsTitle}</h3>

          <div className="flex flex-col md:flex-row gap-md">
            <Button
              type="button"
              variant={period === "all" ? "primary" : "secondary"}
              onClick={() => handlePeriodChange("all")}
            >
              Todos
            </Button>
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
        </div>
        {errands.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.admin.noErrands}
          </p>
        ) : (
          <Table rows={errands} columns={errandColumns} rowKey="id" />
        )}
      </div>
    </div>
  );
};
