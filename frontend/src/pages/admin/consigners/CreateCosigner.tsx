import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import { Button, Input } from "../../../components/ui";

export const CreateCosigner: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [riderId, setRiderId] = useState("");
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    relationship: "",
    identity_document: "",
  });

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !riderId) return;
    setLoading(true);
    setError(null);
    try {
      await api.request(`/riders/${riderId}/cosigners`, {
        method: "POST",
        token,
        body: form,
      });
      navigate("/admin/contracts");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear codeudor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section px-2xl">
      <div className="max-w-[600px] mx-auto">
        <h2 className="mb-2xl">Registrar Codeudor</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            label="ID del Motociclista"
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
            placeholder="UUID del rider"
            required
          />
          <Input
            label="Nombre"
            value={form.name}
            onChange={handleChange("name")}
            placeholder="Nombre completo"
            required
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={handleChange("address")}
            placeholder="Dirección del codeudor"
            required
          />
          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="3001234567"
              required
            />
            <Input
              label="Relación"
              value={form.relationship}
              onChange={handleChange("relationship")}
              placeholder="Madre, Hermano..."
              required
            />
          </div>
          <Input
            label="Documento de Identidad"
            value={form.identity_document}
            onChange={handleChange("identity_document")}
            placeholder="1234567890"
            required
          />
          {error && (
            <span className="font-body text-caption text-error">{error}</span>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? "Registrando..." : "Registrar Codeudor"}
          </Button>
        </form>
      </div>
    </div>
  );
};
