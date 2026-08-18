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
import type { ErrandQuoteResponse, QuoteErrandRequest } from "../../types/api";

type CreateErrandForm = {
  type: QuoteErrandRequest["type"];
  description: string;
  payment_method: "cash" | "transfer";
};

const formatCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const CreateErrand: React.FC = () => {
  const navigate = useNavigate();
  const { create, quote } = useErrandActions();
  const [error, setError] = useState<string | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [quotePreview, setQuotePreview] = useState<ErrandQuoteResponse | null>(
    null,
  );
  const [routeEstimateError, setRouteEstimateError] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [quoteRefreshKey, setQuoteRefreshKey] = useState(0);
  const [route, setRoute] = useState<RouteValue>({
    origin: null,
    destination: null,
  });
  const [form, setForm] = useState<CreateErrandForm>({
    type: "object_transport",
    description: "",
    payment_method: "cash",
  });

  const handleChange =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((previous) => ({
        ...previous,
        [field]: event.target.value as CreateErrandForm[typeof field],
      }));
    };

  useEffect(() => {
    let current = true;
    const { origin, destination } = route;

    if (!origin || !destination) {
      setRoutePreview(null);
      setQuotePreview(null);
      setRouteEstimateError(null);
      return () => {
        current = false;
      };
    }

    setRoutePreview(null);
    setQuotePreview(null);
    setRouteEstimateError(null);
    quote({ type: form.type, origin, destination })
      .then((nextQuote) => {
        if (current) {
          setRoutePreview(nextQuote);
          setQuotePreview(nextQuote);
        }
      })
      .catch(() => {
        if (current) {
          setRouteEstimateError(
            "No fue posible cotizar la ruta. Ajusta los puntos o inténtalo de nuevo.",
          );
        }
      });

    return () => {
      current = false;
    };
  }, [
    quote,
    form.type,
    quoteRefreshKey,
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

    if (!quotePreview) {
      setError("Espera la cotización antes de aprobar y crear el favor.");
      return;
    }

    if (new Date(quotePreview.expiresAt).getTime() <= Date.now()) {
      setQuotePreview(null);
      setQuoteRefreshKey((previous) => previous + 1);
      setError(
        "La cotización venció. Revisa el nuevo valor antes de continuar.",
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
        quote_id: quotePreview.quoteId,
      });
      navigate("/user/errands");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear mandado");
    } finally {
      setLoading(false);
    }
  };

  let submitLabel = "Cotizando favor...";
  if (loading) {
    submitLabel = t.user.creatingBtn;
  } else if (quotePreview) {
    submitLabel = "Aprobar costo y crear favor";
  }

  return (
    <div className="section px-0 lg:px-2xl">
      <div className="mx-auto max-w-[600px] lg:max-w-[600px]">
        <h2 className="hidden mb-2xl lg:block">{t.user.createErrandTitle}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-0 lg:gap-lg">
          <div className="order-1 w-full lg:order-2">
            <RoutePickerMapbox
              value={route}
              onChange={setRoute}
              routePreview={routePreview}
            />
            {routeEstimateError && (
              <p className="px-xl pt-sm font-body text-caption text-error lg:px-0">
                {routeEstimateError}
              </p>
            )}
          </div>

          <section className="order-2 z-10 -mt-md flex flex-col gap-lg rounded-t-xl bg-canvas px-xl py-2xl shadow-card lg:order-1 lg:mt-0 lg:rounded-lg lg:border lg:border-hairline-soft">
            <div>
              <h2 className="mb-xs lg:hidden">{t.user.createErrandTitle}</h2>
              <p className="caption lg:hidden">
                Selecciona origen y destino directamente en el mapa.
              </p>
            </div>
            <div className="w-full">
              <label className="block mb-xs font-body text-body-sm-medium text-ink">
                {t.user.type}
              </label>
              <select
                value={form.type}
                onChange={handleChange("type")}
                className="input-field"
              >
                <option value="object_transport">
                  {t.user.objectTransport}
                </option>
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

            {quotePreview ? (
              <div className="rounded-md border border-primary bg-cream px-md py-md">
                <p className="font-body text-body-sm-medium text-ink">
                  Valor total del favor
                </p>
                <p className="font-body text-heading-3 text-primary">
                  {formatCop.format(quotePreview.fareCop)}
                </p>
                <p className="caption">
                  Esta cotización se aplicará al crear el favor y vence a las{" "}
                  {new Date(quotePreview.expiresAt).toLocaleTimeString(
                    "es-CO",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                  .
                </p>
              </div>
            ) : (
              route.origin &&
              route.destination && (
                <p className="caption">Calculando el valor de tu favor...</p>
              )
            )}

            {error && (
              <p className="font-body text-caption text-error">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !quotePreview}
            >
              {submitLabel}
            </Button>
          </section>
        </form>
      </div>
    </div>
  );
};
