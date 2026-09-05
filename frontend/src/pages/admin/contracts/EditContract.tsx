import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  api,
  type AdminContractDetails,
} from "../../../services/api";
import { Button, Input } from "../../../components/ui";
import { inputRules } from "../../../validation/inputRules";

interface ContractFormState {
  end_date: string;
  monthly_amount: string;
  payment_day: string;
  notes: string;
}

const emptyForm: ContractFormState = {
  end_date: "",
  monthly_amount: "",
  payment_day: "",
  notes: "",
};

const toDateInput = (value: string): string => value.slice(0, 10);

const toFormState = (contract: AdminContractDetails): ContractFormState => ({
  end_date: toDateInput(contract.end_date),
  monthly_amount: String(contract.monthly_amount),
  payment_day: String(contract.payment_day),
  notes: contract.notes ?? "",
});

export const EditContract: React.FC<{ readonly contractId: string }> = ({
  contractId,
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<AdminContractDetails | null>(null);
  const [form, setForm] = useState<ContractFormState>(emptyForm);
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
      .getContract(token, contractId)
      .then((data) => {
        if (cancelled) return;
        setContract(data);
        setForm(toFormState(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el contrato",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contractId, token]);

  const handleChange =
    (field: keyof ContractFormState) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await api.updateContract(token, contractId, {
        end_date: form.end_date,
        monthly_amount: Number.parseFloat(form.monthly_amount),
        payment_day: Number.parseInt(form.payment_day, 10),
        notes: form.notes,
      });
      navigate("/admin?tab=contracts");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar el contrato",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="caption text-center py-2xl">Cargando...</p>;
  }

  if (!contract) {
    return (
      <p className="section px-2xl font-body text-body-md text-error">
        {error ?? "No se encontró el contrato."}
      </p>
    );
  }

  const canEdit = contract.status === "active";

  return (
    <div className="section px-2xl">
      <div className="mx-auto max-w-[600px]">
        <h2 className="mb-sm">Editar contrato</h2>
        <p className="mb-2xl font-body text-body-sm text-muted">
          Los identificadores del rider y la motocicleta no se modifican aquí.
          La cancelación y renovación siguen siendo acciones independientes.
        </p>

        <div className="mb-lg grid grid-cols-1 gap-lg sm:grid-cols-2">
          <Input label="Rider asignado" value={contract.rider_id} disabled />
          <Input
            label="Motocicleta asignada"
            value={contract.motorcycle_id}
            disabled
          />
          <Input
            label="Fecha de inicio"
            value={toDateInput(contract.start_date)}
            disabled
          />
          <Input label="Estado" value={contract.status} disabled />
        </div>

        {!canEdit && (
          <p className="mb-lg font-body text-caption text-muted">
            Solo los contratos activos pueden editarse.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            label="Fecha de finalización"
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange("end_date")}
            required
            disabled={!canEdit}
          />
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Input
              {...inputRules.positiveInteger}
              label="Monto mensual ($)"
              name="monthly_amount"
              type="number"
              value={form.monthly_amount}
              onChange={handleChange("monthly_amount")}
              required
              disabled={!canEdit}
            />
            <Input
              {...inputRules.paymentDay}
              label="Día de pago (1-28)"
              name="payment_day"
              type="number"
              value={form.payment_day}
              onChange={handleChange("payment_day")}
              required
              disabled={!canEdit}
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
              disabled={!canEdit}
            />
          </div>
          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button
            type="submit"
            className="mt-lg w-full"
            disabled={!canEdit || saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
};
