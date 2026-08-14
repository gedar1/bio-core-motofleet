import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useErrandActions } from "../../hooks";
import {
  Button,
  Input,
  RoutePickerMapbox,
  type RoutePreview,
  type RouteValue,
} from "../../components/ui";
import { t } from "../../i18n";

export const CreateErrand: React.FC = () => {
  const navigate = useNavigate();
  const { create, estimateRoute } = useErrandActions();
  const [error, setError] = useState<string | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [routeEstimateError, setRouteEstimateError] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RouteValue>({
    origin: null,
    destination: null,
  });
  const [form, setForm] = useState({
    type: "object_transport",
    description: "",
    payment_method: "cash",
  });

  const handleChange =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  useEffect(() => {
    let current = true;
    const { origin, destination } = route;

    if (!origin || !destination) {
      setRoutePreview(null);
      setRouteEstimateError(null);
      return () => {
        current = false;
      };
    }

    setRoutePreview(null);
    setRouteEstimateError(null);
    estimateRoute(origin, destination)
      .then((estimate) => {
        if (current) setRoutePreview(estimate);
      })
      .catch(() => {
        if (current) {
          setRouteEstimateError(
            "No fue posible previsualizar la ruta. Ajusta los puntos o inténtalo de nuevo.",
          );
        }
      });

    return () => {
      current = false;
    };
  }, [
    estimateRoute,
    route.destination?.latitude,
    route.destination?.longitude,
    route.origin?.latitude,
    route.origin?.longitude,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!route.origin || !route.destination) {
      setError(
        "Selecciona el origen y el destino en el mapa antes de continuar.",
      );
      return;
    }

    setLoading(true);
    try {
      await create({
        ...form,
        origin_address: route.origin.address,
        origin_lat: route.origin.latitude,
        origin_lng: route.origin.longitude,
        destination_address: route.destination.address,
        destination_lat: route.destination.latitude,
        destination_lng: route.destination.longitude,
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
          <RoutePickerMapbox
            value={route}
            onChange={setRoute}
            routePreview={routePreview}
          />
          {routeEstimateError && (
            <p className="font-body text-caption text-error">
              {routeEstimateError}
            </p>
          )}

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
