import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Button, Input } from "../../components/ui";

export const CreateRider: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
    document_type: "",
    document_number: "",
    license_number: "",
    license_expiry: "",
    insurance_number: "",
    insurance_expiry: "",
    bond_amount: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await api.registerRider({
        ...form,
        bond_amount: Number.parseFloat(form.bond_amount),
      });
      navigate("/admin/riders");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al registrar motociclista",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section px-2xl">
      <div className="max-w-[600px] mx-auto">
        <h2 className="mb-2xl">Registrar Motociclista</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            label="Nombre"
            value={form.name}
            onChange={handleChange("name")}
            placeholder="Nombre completo"
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
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="rider@email.com"
              required
            />
          </div>
          <Input
            label="Dirección"
            value={form.address}
            onChange={handleChange("address")}
            placeholder="Dirección del motociclista"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={handleChange("password")}
            placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
            required
          />

          <hr className="my-sm" />
          <p className="caption">DOCUMENTACIÓN</p>

          <div className="grid grid-cols-2 gap-lg">
            <div className="w-full">
              <label
                htmlFor="document_type"
                className="block mb-xs font-body text-body-sm-medium text-ink"
              >
                Tipo de documento
              </label>
              <select
                id="document_type"
                value={form.document_type}
                onChange={handleChange("document_type")}
                className="input-field"
                required
              >
                <option value="">— Seleccionar tipo —</option>
                <option value="CC">CC — Cédula de ciudadanía</option>
                <option value="CE">CE — Cédula de extranjería</option>
                <option value="PPT">
                  PPT — Permiso por Protección Temporal
                </option>
                <option value="PASAPORTE">PASAPORTE</option>
              </select>
            </div>
            <Input
              label="Número de documento"
              value={form.document_number}
              onChange={handleChange("document_number")}
              placeholder="1234567890"
              minLength={5}
              maxLength={30}
              pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
              autoCapitalize="characters"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Número de Licencia"
              value={form.license_number}
              onChange={handleChange("license_number")}
              placeholder="LIC-12345"
              required
            />
            <Input
              label="Vencimiento Licencia"
              type="date"
              value={form.license_expiry}
              onChange={handleChange("license_expiry")}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Número de Seguro"
              value={form.insurance_number}
              onChange={handleChange("insurance_number")}
              placeholder="SEG-99999"
              required
            />
            <Input
              label="Vencimiento Seguro"
              type="date"
              value={form.insurance_expiry}
              onChange={handleChange("insurance_expiry")}
              required
            />
          </div>
          <Input
            label="Monto de Fianza ($)"
            type="number"
            value={form.bond_amount}
            onChange={handleChange("bond_amount")}
            placeholder="500000"
            required
          />

          <hr className="my-sm" />
          <p className="caption">CONTACTO DE EMERGENCIA</p>

          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Nombre Contacto"
              value={form.emergency_contact_name}
              onChange={handleChange("emergency_contact_name")}
              placeholder="Nombre del contacto"
              required
            />
            <Input
              label="Teléfono Contacto"
              value={form.emergency_contact_phone}
              onChange={handleChange("emergency_contact_phone")}
              placeholder="3201112233"
              required
            />
          </div>

          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? "Registrando..." : "Registrar Motociclista"}
          </Button>
        </form>
      </div>
    </div>
  );
};
