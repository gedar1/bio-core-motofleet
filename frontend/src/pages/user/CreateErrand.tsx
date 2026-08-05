import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useErrandActions } from "../../hooks";
import { Button, Input } from "../../components/ui";
import { t } from "../../i18n";

export const CreateErrand: React.FC = () => {
  const navigate = useNavigate();
  const { create } = useErrandActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "object_transport",
    description: "",
    origin_address: "",
    origin_lat: "",
    origin_lng: "",
    destination_address: "",
    destination_lat: "",
    destination_lng: "",
    payment_method: "cash",
  });

  const handleChange =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await create({
        ...form,
        origin_lat: form.origin_lat ? parseFloat(form.origin_lat) : undefined,
        origin_lng: form.origin_lng ? parseFloat(form.origin_lng) : undefined,
        destination_lat: form.destination_lat
          ? parseFloat(form.destination_lat)
          : undefined,
        destination_lng: form.destination_lng
          ? parseFloat(form.destination_lng)
          : undefined,
      });
      navigate("/user/errands");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear mandado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section px-2xl">
      <div className="max-w-[600px] mx-auto">
        <h2 className="mb-2xl">{t.user.createErrandTitle}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <div className="w-full">
            <label className="block mb-xs font-body text-body-sm-medium text-ink">
              {t.user.type}
            </label>
            <select
              value={form.type}
              onChange={handleChange("type")}
              className="input-field"
            >
              <option value="object_transport">{t.user.objectTransport}</option>
              <option value="purchase">{t.user.purchase}</option>
              <option value="errand">{t.user.errand}</option>
            </select>
          </div>

          <Input
            label={t.user.description}
            value={form.description}
            onChange={handleChange("description")}
            placeholder={t.user.descPlaceholder}
            required
          />
          <Input
            label={t.user.originAddress}
            value={form.origin_address}
            onChange={handleChange("origin_address")}
            required
          />

          <div className="grid grid-cols-2 gap-lg">
            <Input
              label={t.user.originLat}
              value={form.origin_lat}
              onChange={handleChange("origin_lat")}
              placeholder="6.2518"
            />
            <Input
              label={t.user.originLng}
              value={form.origin_lng}
              onChange={handleChange("origin_lng")}
              placeholder="-75.5636"
            />
          </div>

          <Input
            label={t.user.destAddress}
            value={form.destination_address}
            onChange={handleChange("destination_address")}
            required
          />

          <div className="grid grid-cols-2 gap-lg">
            <Input
              label={t.user.destLat}
              value={form.destination_lat}
              onChange={handleChange("destination_lat")}
              placeholder="6.2088"
            />
            <Input
              label={t.user.destLng}
              value={form.destination_lng}
              onChange={handleChange("destination_lng")}
              placeholder="-75.5672"
            />
          </div>

          <div className="w-full">
            <label className="block mb-xs font-body text-body-sm-medium text-ink">
              {t.user.paymentMethod}
            </label>
            <select
              value={form.payment_method}
              onChange={handleChange("payment_method")}
              className="input-field"
            >
              <option value="cash">{t.user.cash}</option>
              <option value="transfer">{t.user.transfer}</option>
            </select>
          </div>

          {error && (
            <p className="font-body text-caption text-error">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading ? t.user.creatingBtn : t.user.createBtn}
          </Button>
        </form>
      </div>
    </div>
  );
};
