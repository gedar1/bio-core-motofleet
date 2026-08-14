import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Button, Input } from "../../components/ui";

export const CreateMotorcycle: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    plate: "",
    brand: "",
    model: "",
    year: "",
    color: "",
    engine_cc: "",
    soat_expiry: "",
    inspection_expiry: "",
  });

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await api.createMotorcycle(token, {
        ...form,
        year: parseInt(form.year, 10),
        engine_cc: parseInt(form.engine_cc, 10),
      });
      navigate("/admin/motorcycles");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al crear motocicleta",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section px-2xl">
      <div className="max-w-[600px] mx-auto">
        <h2 className="mb-2xl">Registrar Motocicleta</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            label="Placa"
            value={form.plate}
            onChange={handleChange("plate")}
            placeholder="ABC123"
            required
          />
          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Marca"
              value={form.brand}
              onChange={handleChange("brand")}
              placeholder="Yamaha"
              required
            />
            <Input
              label="Modelo"
              value={form.model}
              onChange={handleChange("model")}
              placeholder="FZ25"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-lg">
            <Input
              label="Año"
              type="number"
              value={form.year}
              onChange={handleChange("year")}
              placeholder="2024"
              required
            />
            <Input
              label="Color"
              value={form.color}
              onChange={handleChange("color")}
              placeholder="Negro"
              required
            />
            <Input
              label="Cilindraje (cc)"
              type="number"
              value={form.engine_cc}
              onChange={handleChange("engine_cc")}
              placeholder="250"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Vencimiento SOAT"
              type="date"
              value={form.soat_expiry}
              onChange={handleChange("soat_expiry")}
              required
            />
            <Input
              label="Vencimiento Tecnomecánica"
              type="date"
              value={form.inspection_expiry}
              onChange={handleChange("inspection_expiry")}
              required
            />
          </div>
          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? "Registrando..." : "Registrar Motocicleta"}
          </Button>
        </form>
      </div>
    </div>
  );
};
