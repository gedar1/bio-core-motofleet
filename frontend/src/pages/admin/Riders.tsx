import React from "react";
import { Link } from "react-router-dom";
import { useRiders } from "../../hooks/useRiders";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Card, Button } from "../../components/ui";
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            {riders.map((r) => (
              <Card key={r.id} className="p-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="mb-xs">{r.name}</h4>
                    <p className="font-body text-body-sm text-slate">
                      {r.email} · {r.phone}
                    </p>
                    <p className="font-body text-body-sm text-slate mt-xxs">
                      {r.address}
                    </p>
                    <p className="caption mt-sm">
                      Documento: {r.document_type ?? "Pendiente de registro"}
                    </p>
                    <p className="caption mt-xxs">
                      Licencia: {r.license_number} · Exp: {r.license_expiry}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-xs">
                    <span
                      className={`badge-${r.status === "active" ? "orange" : "cream"}`}
                    >
                      {translateStatus(r.status)}
                    </span>
                    <span className="caption">
                      {r.available ? "✅ Disponible" : "⏸️ No disponible"}
                    </span>
                  </div>
                </div>
                <p className="caption mt-sm text-muted">ID: {r.id}</p>
                <Button
                  variant={r.available ? "secondary" : "primary"}
                  className="mt-sm w-full"
                  onClick={() => handleToggle(r.id, r.available)}
                >
                  {r.available
                    ? "Desactivar disponibilidad"
                    : "Activar disponibilidad"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
