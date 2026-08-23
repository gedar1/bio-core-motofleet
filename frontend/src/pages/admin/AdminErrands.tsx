import React from "react";
import { useAdminErrands } from "../../hooks";
import type { Errand } from "../../hooks/useErrands";
import { Table, type TableColumn } from "../../components/shared";
import { t, translateStatus } from "../../i18n";

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
      <span className="caption">{translateStatus(errand.status)}</span>
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
];

export const AdminErrands: React.FC = () => {
  const { errands, loading } = useAdminErrands();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section lg:px-2xl px-md">
      <div className="max-w-[1280px] mx-auto">
        <h3 className="mb-2xl">{t.admin.errandsTitle}</h3>
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
