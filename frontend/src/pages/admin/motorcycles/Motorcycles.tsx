import React from "react";
import { Link } from "react-router-dom";
import { useMotorcycles } from "../../../hooks";
import type { Motorcycle } from "../../../hooks/useMotorcycles";
import { Table, type TableColumn } from "../../../components/shared";
import { Button } from "../../../components/ui";
import { t, translateStatus } from "../../../i18n";
import { formatDateColombia } from "../../../utils/dateFormatter";

const statusBadgeClass: Record<string, string> = {
  available: "badge-orange",
  rented: "badge-dark",
  maintenance: "badge-cream",
  retired: "badge-cream",
};

const columns: readonly TableColumn<Motorcycle>[] = [
  {
    id: "plate",
    header: "Placa",
    render: (motorcycle) => (
      <span className="font-body text-body-md font-medium text-ink">
        {motorcycle.plate}
      </span>
    ),
  },
  {
    id: "motorcycle",
    header: "Motocicleta",
    render: (motorcycle) => (
      <div className="flex justify-start items-center gap-xs">
        <p className="font-body text-body-md font-medium text-ink">
          {motorcycle.brand} {motorcycle.model}
        </p>
        <p className="font-body text-body-sm text-slate">
          {motorcycle.year} · {motorcycle.color}
        </p>
      </div>
    ),
  },
  {
    id: "engine-cc",
    header: "Cilindraje",
    render: (motorcycle) => `${motorcycle.engine_cc} `,
  },
  {
    id: "soat_expiry",
    header: "Soat",
    render: (motorcycle) => motorcycle.soat_expiry,
  },
  {
    id: "inspection_expiry",
    header: "Tecnomecanica",
    render: (motorcycle) => motorcycle.inspection_expiry,
  },
  {
    id: "status",
    header: "Estado",
    render: (motorcycle) => (
      <span className={statusBadgeClass[motorcycle.status] ?? "badge-cream"}>
        {translateStatus(motorcycle.status)}
      </span>
    ),
  },
  {
    id: "created_at",
    header: "Creado",
    render: (motorcycle) => (
      <span className="caption">
        {formatDateColombia(motorcycle.created_at)}
      </span>
    ),
  },
  {
    id: "updated_at",
    header: "Actualizado",
    render: (motorcycle) => (
      <span className="caption">
        {formatDateColombia(motorcycle.updated_at)}
      </span>
    ),
  },
];

export const Motorcycles: React.FC = () => {
  const { motorcycles, loading, error, refresh } = useMotorcycles();

  return (
    <div className="section lg:px-2xl px-md">
      <div className="w-full">
        <div className="flex justify-between items-center mb-2xl">
          <h3>{t.admin.motorcyclesTitle}</h3>
          <Link to="/admin/motorcycles/create">
            <Button type="button">{t.adminForms.crear}</Button>
          </Link>
        </div>
        {error ? (
          <div className="flex flex-wrap items-center gap-md font-body text-body-md text-muted">
            <p>Error al cargar las motocicletas.</p>
            <Button type="button" variant="secondary" onClick={refresh}>
              Reintentar
            </Button>
          </div>
        ) : (
          <Table
            rows={motorcycles}
            columns={columns}
            rowKey="id"
            loading={loading}
            loadingContent={t.common.loading}
            emptyContent={t.admin.noMotorcycles}
          />
        )}
      </div>
    </div>
  );
};
