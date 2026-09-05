import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  api,
  type AdminMotorcycleDetails,
} from "../../../services/api";
import { Button, Input } from "../../../components/ui";
import { inputRules } from "../../../validation/inputRules";

interface MotorcycleFormState {
  color: string;
  engine_cc: string;
  soat_expiry: string;
  inspection_expiry: string;
}

const emptyForm: MotorcycleFormState = {
  color: "",
  engine_cc: "",
  soat_expiry: "",
  inspection_expiry: "",
};

const toDateInput = (value: string): string => value.slice(0, 10);

const toFormState = (
  motorcycle: AdminMotorcycleDetails,
): MotorcycleFormState => ({
  color: motorcycle.color,
  engine_cc: String(motorcycle.engine_cc),
  soat_expiry: toDateInput(motorcycle.soat_expiry),
  inspection_expiry: toDateInput(motorcycle.inspection_expiry),
});

export const EditMotorcycle: React.FC<{
  readonly motorcycleId: string;
}> = ({ motorcycleId }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [motorcycle, setMotorcycle] =
    useState<AdminMotorcycleDetails | null>(null);
  const [form, setForm] = useState<MotorcycleFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getMotorcycle(token, motorcycleId)
      .then((data) => {
        if (cancelled) return;
        setMotorcycle(data);
        setForm(toFormState(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la motocicleta",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [motorcycleId, token]);

  const handleChange =
    (field: keyof MotorcycleFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await api.updateMotorcycle(token, motorcycleId, {
        color: form.color,
        engine_cc: Number.parseInt(form.engine_cc, 10),
        soat_expiry: form.soat_expiry,
        inspection_expiry: form.inspection_expiry,
      });
      navigate("/admin?tab=motorcycles");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al actualizar la motocicleta",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="caption text-center py-2xl">Cargando...</p>;
  }

  if (!motorcycle) {
    return (
      <p className="section px-2xl font-body text-body-md text-error">
        {error ?? "No se encontró la motocicleta."}
      </p>
    );
  }

  return (
    <div className="section px-2xl">
      <div className="mx-auto max-w-[600px]">
        <h2 className="mb-sm">Editar motocicleta</h2>
        <p className="mb-2xl font-body text-body-sm text-muted">
          La placa, marca, modelo, año y estado se mantienen fuera de este
          formulario para no mezclar la edición con el cambio de estado.
        </p>

        <div className="mb-lg grid grid-cols-1 gap-lg sm:grid-cols-2">
          <Input label="Placa" value={motorcycle.plate} disabled />
          <Input
            label="Motocicleta"
            value={`${motorcycle.brand} ${motorcycle.model}`}
            disabled
          />
          <Input label="Año" value={String(motorcycle.year)} disabled />
          <Input label="Estado" value={motorcycle.status} disabled />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            {...inputRules.color}
            label="Color"
            name="color"
            value={form.color}
            onChange={handleChange("color")}
            required
          />
          <Input
            {...inputRules.engineCc}
            label="Cilindraje (cc)"
            name="engine_cc"
            type="number"
            value={form.engine_cc}
            onChange={handleChange("engine_cc")}
            required
          />
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Input
              {...inputRules.futureDate()}
              label="Vencimiento SOAT"
              name="soat_expiry"
              type="date"
              value={form.soat_expiry}
              onChange={handleChange("soat_expiry")}
              required
            />
            <Input
              {...inputRules.futureDate()}
              label="Vencimiento Tecnomecánica"
              name="inspection_expiry"
              type="date"
              value={form.inspection_expiry}
              onChange={handleChange("inspection_expiry")}
              required
            />
          </div>
          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
};
