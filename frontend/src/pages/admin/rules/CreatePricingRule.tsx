import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import { Button, Input } from "../../../components/ui";
import { inputRules } from "../../../validation/inputRules";

const DEFAULT_POLICY = {
  base_rate: "5000",
  rate_per_km: "1500",
  inside_bello_flat_fare_cop: "10000",
  outside_minimum_fare_cop: "12000",
  commission_percentage: "15",
};

export const CreatePricingRule: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    errand_type: "object_transport",
    ...DEFAULT_POLICY,
  });

  const handleChange =
    (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    const baseRateCop = Number(form.base_rate);
    const ratePerKmCop = Number(form.rate_per_km);
    const belloFlatFareCop = Number(form.inside_bello_flat_fare_cop);
    const outsideMinimumFareCop = Number(form.outside_minimum_fare_cop);
    const commissionPercentage = Number(form.commission_percentage);

    if (
      !Number.isSafeInteger(baseRateCop) ||
      baseRateCop < 1 ||
      !Number.isSafeInteger(ratePerKmCop) ||
      ratePerKmCop < 0 ||
      !Number.isSafeInteger(belloFlatFareCop) ||
      belloFlatFareCop < 1 ||
      !Number.isSafeInteger(outsideMinimumFareCop) ||
      outsideMinimumFareCop <= belloFlatFareCop ||
      !Number.isSafeInteger(commissionPercentage) ||
      commissionPercentage < 1 ||
      commissionPercentage > 50
    ) {
      setError(
        "Usa valores enteros: el mínimo fuera de Bello debe ser mayor que la tarifa local.",
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
          inside_bello_flat_fare_cop: belloFlatFareCop,
          outside_minimum_fare_cop: outsideMinimumFareCop,
          commission_percentage: commissionPercentage,
        },
      });
      navigate("/admin?tab=pricing");
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
        <h2 className="mb-sm">Crear regla de tarifa</h2>
        <p className="mb-2xl font-body text-body-sm text-muted">
          La tarifa local aplica cuando ambos pines exactos están dentro de
          Bello. Si alguno queda fuera, se usa el mínimo exterior o la fórmula
          por km, el valor que resulte mayor.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <div className="w-full">
            <label className="block mb-xs font-body text-body-sm-medium text-ink">
              Tipo de mandado
            </label>
            <select
              value={form.errand_type}
              onChange={handleChange("errand_type")}
              className="input-field"
            >
              <option value="object_transport">Envío de objetos</option>
              <option value="purchase">Compra</option>
              <option value="errand">Trámite</option>
            </select>
          </div>
          <Input
            {...inputRules.positiveInteger}
            label="Tarifa fija dentro de Bello (COP)"
            name="inside_bello_flat_fare_cop"
            type="number"
            value={form.inside_bello_flat_fare_cop}
            onChange={handleChange("inside_bello_flat_fare_cop")}
            required
          />
          <Input
            {...inputRules.positiveInteger}
            label="Mínimo si sale de Bello (COP)"
            name="outside_minimum_fare_cop"
            type="number"
            value={form.outside_minimum_fare_cop}
            onChange={handleChange("outside_minimum_fare_cop")}
            required
          />
          <Input
            {...inputRules.positiveInteger}
            label="Tarifa base fuera de Bello (COP)"
            name="base_rate"
            type="number"
            value={form.base_rate}
            onChange={handleChange("base_rate")}
            required
          />
          <Input
            {...inputRules.nonNegativeInteger}
            label="Tarifa por km fuera de Bello (COP)"
            name="rate_per_km"
            type="number"
            value={form.rate_per_km}
            onChange={handleChange("rate_per_km")}
            required
          />
          <Input
            {...inputRules.commissionPercentage}
            label="Comisión entera (%)"
            name="commission_percentage"
            type="number"
            value={form.commission_percentage}
            onChange={handleChange("commission_percentage")}
            required
          />
          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? "Creando..." : "Crear regla"}
          </Button>
        </form>
      </div>
    </div>
  );
};
