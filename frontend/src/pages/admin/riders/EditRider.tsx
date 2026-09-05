import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { api, type AdminRiderDetails } from "../../../services/api";
import { Button, Input } from "../../../components/ui";
import { inputRules } from "../../../validation/inputRules";

interface RiderFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  license_number: string;
  license_expiry: string;
  insurance_number: string;
  insurance_expiry: string;
  bond_amount: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

const emptyForm: RiderFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  license_number: "",
  license_expiry: "",
  insurance_number: "",
  insurance_expiry: "",
  bond_amount: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

const toFormState = (rider: AdminRiderDetails): RiderFormState => ({
  name: rider.name,
  phone: rider.phone,
  email: rider.email,
  address: rider.address,
  license_number: rider.license_number,
  license_expiry: rider.license_expiry,
  insurance_number: rider.insurance_number,
  insurance_expiry: rider.insurance_expiry,
  bond_amount: String(rider.bond_amount),
  emergency_contact_name: rider.emergency_contact_name,
  emergency_contact_phone: rider.emergency_contact_phone,
});

export const EditRider: React.FC<{ readonly riderId: string }> = ({
  riderId,
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rider, setRider] = useState<AdminRiderDetails | null>(null);
  const [form, setForm] = useState<RiderFormState>(emptyForm);
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
      .getRider(token, riderId)
      .then((data) => {
        if (cancelled) return;
        setRider(data);
        setForm(toFormState(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar el motociclista",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [riderId, token]);

  const handleChange =
    (field: keyof RiderFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await api.updateRider(token, riderId, {
        ...form,
        bond_amount: Number.parseFloat(form.bond_amount),
      });
      navigate("/admin?tab=riders");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al actualizar el motociclista",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="caption text-center py-2xl">Cargando...</p>;
  }

  if (!rider) {
    return (
      <p className="section px-2xl font-body text-body-md text-error">
        {error ?? "No se encontró el motociclista."}
      </p>
    );
  }

  return (
    <div className="section px-2xl">
      <div className="mx-auto max-w-[600px]">
        <h2 className="mb-sm">Editar motociclista</h2>
        <p className="mb-2xl font-body text-body-sm text-muted">
          Actualiza los datos de perfil y operación. La contraseña y el
          documento de identidad no se modifican desde este formulario.
        </p>

        <div className="mb-lg grid grid-cols-1 gap-lg sm:grid-cols-2">
          <Input
            label="Tipo de documento"
            value={rider.document_type ?? "No registrado"}
            disabled
          />
          <Input
            label="Número de documento"
            value={rider.document_number ?? "No registrado"}
            disabled
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            {...inputRules.name}
            label="Nombre"
            name="name"
            value={form.name}
            onChange={handleChange("name")}
            required
          />
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Input
              {...inputRules.phone}
              label="Teléfono"
              name="phone"
              value={form.phone}
              onChange={handleChange("phone")}
              required
            />
            <Input
              {...inputRules.email}
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              required
            />
          </div>
          <Input
            {...inputRules.address}
            label="Dirección"
            name="address"
            value={form.address}
            onChange={handleChange("address")}
            required
          />

          <hr className="my-sm" />
          <p className="caption">DOCUMENTACIÓN OPERATIVA</p>

          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Input
              {...inputRules.licenseNumber}
              label="Número de licencia"
              name="license_number"
              value={form.license_number}
              onChange={handleChange("license_number")}
              required
            />
            <Input
              {...inputRules.futureDate()}
              label="Vencimiento de licencia"
              name="license_expiry"
              type="date"
              value={form.license_expiry}
              onChange={handleChange("license_expiry")}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Input
              {...inputRules.licenseNumber}
              label="Número de seguro"
              name="insurance_number"
              value={form.insurance_number}
              onChange={handleChange("insurance_number")}
              required
            />
            <Input
              {...inputRules.futureDate()}
              label="Vencimiento de seguro"
              name="insurance_expiry"
              type="date"
              value={form.insurance_expiry}
              onChange={handleChange("insurance_expiry")}
              required
            />
          </div>
          <Input
            {...inputRules.positiveInteger}
            label="Monto de fianza ($)"
            name="bond_amount"
            type="number"
            value={form.bond_amount}
            onChange={handleChange("bond_amount")}
            required
          />

          <hr className="my-sm" />
          <p className="caption">CONTACTO DE EMERGENCIA</p>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Input
              {...inputRules.shortText}
              label="Nombre del contacto"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={handleChange("emergency_contact_name")}
              required
            />
            <Input
              {...inputRules.phone}
              label="Teléfono del contacto"
              name="emergency_contact_phone"
              value={form.emergency_contact_phone}
              onChange={handleChange("emergency_contact_phone")}
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
