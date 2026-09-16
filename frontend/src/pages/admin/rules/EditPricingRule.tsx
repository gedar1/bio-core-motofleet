import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { api, type AdminPricingRuleDetails } from "../../../services/api";
import { Button, Input } from "../../../components/ui";
import { inputRules } from "../../../validation/inputRules";
import { t, translateStatus } from "../../../i18n";

interface PricingFormState {
  base_rate: string;
  rate_per_km: string;
  inside_bello_flat_fare_cop: string;
  outside_minimum_fare_cop: string;
  commission_percentage: string;
}

const emptyForm: PricingFormState = {
  base_rate: "",
  rate_per_km: "",
  inside_bello_flat_fare_cop: "",
  outside_minimum_fare_cop: "",
  commission_percentage: "",
};

const toFormState = (rule: AdminPricingRuleDetails): PricingFormState => ({
  base_rate: String(rule.base_rate),
  rate_per_km: String(rule.rate_per_km),
  inside_bello_flat_fare_cop: String(rule.inside_bello_flat_fare_cop),
  outside_minimum_fare_cop: String(rule.outside_minimum_fare_cop),
  commission_percentage: String(rule.commission_percentage),
});

export const EditPricingRule: React.FC<{ readonly ruleId: string }> = ({
  ruleId,
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rule, setRule] = useState<AdminPricingRuleDetails | null>(null);
  const [form, setForm] = useState<PricingFormState>(emptyForm);
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
      .getPricingRule(token, ruleId)
      .then((data) => {
        if (cancelled) return;
        setRule(data);
        setForm(toFormState(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la regla de tarifa",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ruleId, token]);

  const handleChange =
    (field: keyof PricingFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    const baseRate = Number(form.base_rate);
    const ratePerKm = Number(form.rate_per_km);
    const belloFlatFare = Number(form.inside_bello_flat_fare_cop);
    const outsideMinimumFare = Number(form.outside_minimum_fare_cop);
    const commission = Number(form.commission_percentage);

    if (
      !Number.isSafeInteger(baseRate) ||
      baseRate < 1 ||
      !Number.isSafeInteger(ratePerKm) ||
      ratePerKm < 0 ||
      !Number.isSafeInteger(belloFlatFare) ||
      belloFlatFare < 1 ||
      !Number.isSafeInteger(outsideMinimumFare) ||
      outsideMinimumFare <= belloFlatFare ||
      !Number.isSafeInteger(commission) ||
      commission < 1 ||
      commission > 50
    ) {
      setError(
        "Usa valores enteros: el mínimo fuera de Bello debe ser mayor que la tarifa local.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.updatePricingRule(token, ruleId, {
        base_rate: baseRate,
        rate_per_km: ratePerKm,
        inside_bello_flat_fare_cop: belloFlatFare,
        outside_minimum_fare_cop: outsideMinimumFare,
        commission_percentage: commission,
      });
      navigate("/admin?tab=pricing");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al actualizar la regla de tarifa",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="caption text-center py-2xl">Cargando...</p>;
  }

  if (!rule) {
    return (
      <p className="section px-2xl font-body text-body-md text-error">
        {error ?? "No se encontró la regla de tarifa."}
      </p>
    );
  }

  const isActive = Boolean(rule.active);

  return (
    <div className="section px-2xl">
      <div className="mx-auto max-w-[600px]">
        <h2 className="mb-sm">Editar regla de tarifa</h2>
        <p className="mb-2xl font-body text-body-sm text-muted">
          Ambos pines exactos dentro de Bello aplican la tarifa local. Si alguno
          queda fuera, se cobra el mínimo exterior o la fórmula por km, el que
          sea mayor.
        </p>

        <div className="mb-lg grid grid-cols-1 gap-lg sm:grid-cols-2">
          <Input
            label="Tipo de mandado"
            value={translateStatus(rule.errand_type)}
            disabled
          />
          <Input
            label="Estado"
            value={isActive ? t.admin.active : t.admin.inactive}
            disabled
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
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
          <Button type="submit" className="mt-lg w-full" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
};
