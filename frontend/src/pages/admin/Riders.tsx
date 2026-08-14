import React from "react";
import { Link } from "react-router-dom";
import { useRiders, type Rider } from "../../hooks/useRiders";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Table, type TableColumn } from "../../components/shared";
import { Button } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const Riders: React.FC = () => {
  const { riders, loading, refresh } = useRiders();
  const { token } = useAuth();

  const handleToggle = async (
    riderId: string,
    currentAvailable: boolean | number,
  ) => {
    if (!token) return;
    try {
      await api.toggleRiderAvailability(token, riderId, !currentAvailable);
      refresh();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Error al cambiar disponibilidad",
      );
    }
  };

  const columns: readonly TableColumn<Rider>[] = [
    {
      id: "rider",
      header: "Motociclista",
      render: (rider) => (
        <span className="font-body text-body-md text-ink">{rider.name}</span>
      ),
    },
    {
      id: "contact",
      header: "Contacto",
      render: (rider) => (
        <div className="font-body text-body-sm text-slate">
          <p>{rider.email}</p>
          <p>{rider.phone}</p>
        </div>
      ),
    },
    {
      id: "document",
      header: "Documento",
      render: (rider) => rider.document_type ?? "Pendiente de registro",
    },
    {
      id: "license",
      header: "Licencia",
      render: (rider) =>
        `${rider.license_number} · Exp: ${rider.license_expiry}`,
    },
    {
      id: "status",
      header: "Estado",
      render: (rider) => (
        <span
          className={`badge-${rider.status === "active" ? "orange" : "cream"}`}
        >
          {translateStatus(rider.status)}
        </span>
      ),
    },
    {
      id: "availability",
      header: "Disponibilidad",
      render: (rider) => (
        <span className="caption">
          {rider.available ? "✅ Disponible" : "⏸️ No disponible"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      render: (rider) => (
        <Button
          type="button"
          variant={rider.available ? "secondary" : "primary"}
          onClick={() => handleToggle(rider.id, rider.available)}
        >
          {rider.available
            ? "Desactivar disponibilidad"
            : "Activar disponibilidad"}
        </Button>
      ),
    },
  ];

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-2xl">
          <h2>Motociclistas</h2>
          <Link to="/admin/riders/create">
            <Button>+ Nuevo Rider</Button>
          </Link>
        </div>
        {riders.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            No hay motociclistas registrados.
          </p>
        ) : (
          <Table rows={riders} columns={columns} rowKey="id" />
        )}
      </div>
    </div>
  );
};
