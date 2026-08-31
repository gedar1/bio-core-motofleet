import React from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../../../hooks/index";
import type { Contract } from "../../../hooks/useContracts";
import { Table, type TableColumn } from "../../../components/shared";
import { Button } from "../../../components/ui";
import { t, translateStatus } from "../../../i18n";
import {
  formatDateColombia,
  formatDateShort,
} from "../../../utils/dateFormatter";

const contractColumns: readonly TableColumn<Contract>[] = [
  {
    id: "status",
    header: "Estado",
    render: (contract) => (
      <span className="caption">{translateStatus(contract.status)}</span>
    ),
  },
  {
    id: "rider",
    header: "Rider",
    render: (contract) => contract.rider_name ?? "—",
  },
  {
    id: "motorcycle",
    header: "Motocicleta",
    render: (contract) => contract.motorcycle_plate ?? "—",
  },
  {
    id: "monthlyAmount",
    header: "Mensualidad",
    render: (contract) =>
      `$${contract.monthly_amount.toLocaleString()}${t.admin.perMonth}`,
  },
  {
    id: "paymentDay",
    header: "Día de pago",
    render: (contract) => `${t.admin.day} ${contract.payment_day}`,
  },
  {
    id: "term",
    header: "Vigencia",
    render: (contract) =>
      `${formatDateShort(contract.start_date)} → ${formatDateShort(contract.end_date)}`,
  },
  {
    id: "created_at",
    header: "Creado",
    render: (contract) => (
      <span className="caption">{formatDateColombia(contract.created_at)}</span>
    ),
  },
  {
    id: "updated_at",
    header: "Actualizado",
    render: (contract) => (
      <span className="caption">{formatDateColombia(contract.updated_at)}</span>
    ),
  },
];

export const Contracts: React.FC = () => {
  const { contracts, loading } = useContracts();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section lg:px-2xl px-md">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-2xl">
          <h3>{t.admin.contractsTitle}</h3>
          <Link to="/admin/contracts/create">
            <Button>{t.adminForms.crear}</Button>
          </Link>
        </div>
        {contracts.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.admin.noContracts}
          </p>
        ) : (
          <Table rows={contracts} columns={contractColumns} rowKey="id" />
        )}
      </div>
    </div>
  );
};
