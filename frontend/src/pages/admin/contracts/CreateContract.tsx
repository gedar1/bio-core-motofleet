import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import { Button, Input } from "../../../components/ui";

interface RiderOption {
  id: string;
  name: string;
  phone: string;
  status: string;
}

interface MotorcycleOption {
  id: string;
  plate: string;
  brand: string;
  model: string;
  status: string;
}

export const CreateContract: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [motorcycles, setMotorcycles] = useState<MotorcycleOption[]>([]);
  const [form, setForm] = useState({
    rider_id: "",
    motorcycle_id: "",
    start_date: "",
    end_date: "",
    monthly_amount: "",
    payment_day: "",
    notes: "",
  });

  useEffect(() => {
    if (!token) return;
    api
      .getRidersForSelect(token)
      .then(setRiders)
      .catch(() => {});
    api
      .getMotorcyclesForSelect(token)
      .then((data) => {
        // Only show available motorcycles
        setMotorcycles(data.filter((m) => m.status === "available"));
      })
      .catch(() => {});
  }, [token]);

  const handleChange =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await api.request("/contracts", {
        method: "POST",
        token,
        body: {
          ...form,
          monthly_amount: parseFloat(form.monthly_amount),
          payment_day: parseInt(form.payment_day, 10),
        },
      });
      navigate("/admin/contracts");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear contrato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section px-2xl">
      <div className="max-w-[600px] mx-auto">
        <h2 className="mb-2xl">Crear Contrato de Renta</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <div className="w-full">
            <label className="block mb-xs font-body text-body-sm-medium text-ink">
              Motociclista
            </label>
            <select
              value={form.rider_id}
              onChange={handleChange("rider_id")}
              className="input-field"
              required
            >
              <option value="">— Seleccionar motociclista —</option>
              {riders
                .filter((r) => r.status === "active")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.phone}
                  </option>
                ))}
            </select>
          </div>

          <div className="w-full">
            <label className="block mb-xs font-body text-body-sm-medium text-ink">
              Motocicleta
            </label>
            <select
              value={form.motorcycle_id}
              onChange={handleChange("motorcycle_id")}
              className="input-field"
              required
            >
              <option value="">— Seleccionar motocicleta —</option>
              {motorcycles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.plate} · {m.brand} {m.model}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Fecha Inicio"
              type="date"
              value={form.start_date}
              onChange={handleChange("start_date")}
              required
            />
            <Input
              label="Fecha Fin"
              type="date"
              value={form.end_date}
              onChange={handleChange("end_date")}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Monto Mensual ($)"
              type="number"
              value={form.monthly_amount}
              onChange={handleChange("monthly_amount")}
              placeholder="350000"
              required
            />
            <Input
              label="Día de Pago (1-28)"
              type="number"
              value={form.payment_day}
              onChange={handleChange("payment_day")}
              placeholder="5"
              required
            />
          </div>
          <div className="w-full">
            <label className="block mb-xs font-body text-body-sm-medium text-ink">
              Notas (opcional)
            </label>
            <textarea
              className="textarea-field"
              value={form.notes}
              onChange={handleChange("notes")}
              placeholder="Observaciones sobre el contrato..."
              rows={3}
            />
          </div>
          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? "Creando..." : "Crear Contrato"}
          </Button>
        </form>
      </div>
    </div>
  );
};
