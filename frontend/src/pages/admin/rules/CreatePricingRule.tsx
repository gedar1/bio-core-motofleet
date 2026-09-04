import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import { Button, Input } from "../../../components/ui";
import { inputRules } from "../../../validation/inputRules";

export const CreatePricingRule: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    errand_type: "object_transport",
    base_rate: "",
    rate_per_km: "",
    commission_percentage: "",
  });

  const handleChange =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const baseRateCop = Number(form.base_rate);
    const ratePerKmCop = Number(form.rate_per_km);
    const commissionPercentage = Number(form.commission_percentage);

    if (
      !Number.isSafeInteger(baseRateCop) ||
      baseRateCop < 1 ||
      !Number.isSafeInteger(ratePerKmCop) ||
      ratePerKmCop < 0 ||
      !Number.isSafeInteger(commissionPercentage) ||
      commissionPercentage < 1 ||
      commissionPercentage > 50
    ) {
      setError(
        "Ingresa valores enteros en COP y una comisión entera entre 1% y 50%.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.request("/pricing-rules", {
        method: "POST",
        token,
        body: {
          errand_type: form.errand_type,
          base_rate: baseRateCop,
          rate_per_km: ratePerKmCop,
          commission_percentage: commissionPercentage,
        },
      });
      navigate("/admin/pricing");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al crear regla de tarifa",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section px-2xl">
      <div className="max-w-[600px] mx-auto">
        <h2 className="mb-2xl">Crear Regla de Tarifa</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <div className="w-full">
            <label className="block mb-xs font-body text-body-sm-medium text-ink">
              Tipo de Mandado
            </label>
            <select
              value={form.errand_type}
              onChange={handleChange("errand_type")}
              className="input-field"
            >
              <option value="object_transport">Envío de Objetos</option>
              <option value="purchase">Compra</option>
              <option value="errand">Trámite</option>
            </select>
          </div>
          <Input
            {...inputRules.positiveInteger}
            label="Tarifa Base (COP)"
            name="base_rate"
            type="number"
            value={form.base_rate}
            onChange={handleChange("base_rate")}
            placeholder="5000"
            required
          />
          <Input
            {...inputRules.nonNegativeInteger}
            label="Tarifa por Km (COP)"
            name="rate_per_km"
            type="number"
            value={form.rate_per_km}
            onChange={handleChange("rate_per_km")}
            placeholder="1500"
            required
          />
          <Input
            {...inputRules.commissionPercentage}
            label="Comisión entera (%)"
            name="commission_percentage"
            type="number"
            value={form.commission_percentage}
            onChange={handleChange("commission_percentage")}
            placeholder="15"
            required
          />
          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? "Creando..." : "Crear Regla"}
          </Button>
        </form>
      </div>
    </div>
  );
};
