import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Button, Input } from "../../components/ui";

export const CreatePayment: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contractId, setContractId] = useState("");
  const [form, setForm] = useState({
    amount: "",
    payment_date: "",
    payment_method: "cash",
    period: "",
    notes: "",
  });

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
    if (!token || !contractId) return;
    setLoading(true);
    setError(null);
    try {
      await api.request(`/contracts/${contractId}/payments`, {
        method: "POST",
        token,
        body: {
          ...form,
          amount: Number.parseFloat(form.amount),
        },
      });
      navigate("/admin/contracts");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrar pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section px-2xl">
      <div className="max-w-[600px] mx-auto">
        <h2 className="mb-2xl">Registrar Pago de Renta</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            label="ID del Contrato"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            placeholder="UUID del contrato"
            required
          />
          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Monto ($)"
              type="number"
              value={form.amount}
              onChange={handleChange("amount")}
              placeholder="350000"
              required
            />
            <Input
              label="Fecha de Pago"
              type="date"
              value={form.payment_date}
              onChange={handleChange("payment_date")}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-lg">
            <div className="w-full">
              <label className="block mb-xs font-body text-body-sm-medium text-ink">
                Método de Pago
              </label>
              <select
                value={form.payment_method}
                onChange={handleChange("payment_method")}
                className="input-field"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <Input
              label="Periodo (AAAA-MM)"
              value={form.period}
              onChange={handleChange("period")}
              placeholder="2026-08"
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
              placeholder="Observaciones del pago..."
              rows={2}
            />
          </div>
          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? "Registrando..." : "Registrar Pago"}
          </Button>
        </form>
      </div>
    </div>
  );
};
