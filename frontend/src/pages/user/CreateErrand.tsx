import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useErrandActions } from "../../hooks";
import {
  Button,
  Card,
  Input,
  RoutePickerMapbox,
  type RouteLocation,
  type RoutePreview,
  type RouteValue,
} from "../../components/ui";
import { t } from "../../i18n";
import { inputRules } from "../../validation/inputRules";
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

const toRoutingCoordinates = (location: RouteLocation) => ({
  latitude: location.routableLatitude ?? location.latitude,
  longitude: location.routableLongitude ?? location.longitude,
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
  const [createdPin, setCreatedPin] = useState<string | null>(null);

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

    if (
      !origin ||
      !destination ||
      !origin.confirmed ||
      !destination.confirmed
    ) {
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
    const originCoordinates = toRoutingCoordinates(origin);
    const destinationCoordinates = toRoutingCoordinates(destination);
    quote({
      type: form.type,
      origin: originCoordinates,
      destination: destinationCoordinates,
    })
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
    route.destination?.routableLatitude,
    route.destination?.routableLongitude,
    route.destination?.confirmed,
    route.origin?.latitude,
    route.origin?.longitude,
    route.origin?.routableLatitude,
    route.origin?.routableLongitude,
    route.origin?.confirmed,
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

    if (!route.origin.confirmed || !route.destination.confirmed) {
      setError(
        "Confirma el punto de recogida y el punto de entrega antes de continuar.",
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
      const originCoordinates = toRoutingCoordinates(route.origin);
      const destinationCoordinates = toRoutingCoordinates(route.destination);
      const errand = (await create({
        ...form,
        origin_address: route.origin.address,
        origin_address_input: route.origin.inputAddress,
        origin_address_resolved: route.origin.resolvedAddress,
        origin_lat: originCoordinates.latitude,
        origin_lng: originCoordinates.longitude,
        origin_exact_lat: route.origin.latitude,
        origin_exact_lng: route.origin.longitude,
        origin_routable_lat: originCoordinates.latitude,
        origin_routable_lng: originCoordinates.longitude,
        origin_instructions: route.origin.instructions ?? null,
        origin_confirmed: route.origin.confirmed,
        destination_address: route.destination.address,
        destination_address_input: route.destination.inputAddress,
        destination_address_resolved: route.destination.resolvedAddress,
        destination_lat: destinationCoordinates.latitude,
        destination_lng: destinationCoordinates.longitude,
        destination_exact_lat: route.destination.latitude,
        destination_exact_lng: route.destination.longitude,
        destination_routable_lat: destinationCoordinates.latitude,
        destination_routable_lng: destinationCoordinates.longitude,
        destination_instructions: route.destination.instructions ?? null,
        destination_confirmed: route.destination.confirmed,
        quote_id: quotePreview.quoteId,
      })) as { pin?: string };
      if (errand.pin) {
        setCreatedPin(errand.pin);
      } else {
        navigate("/user/errands");
      }
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

  // Show PIN confirmation after creation
  if (createdPin) {
    return (
      <div className="section-mobile md:section px-lg">
        <div className="max-w-[500px] mx-auto">
          <Card className="p-2xl text-center">
            <div className="mb-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light mb-md">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-heading-2 text-ink mb-sm">
                ¡Favor creado exitosamente!
              </h2>
              <p className="font-body text-body-md text-slate">
                Tu solicitud ha sido publicada. Un rider la tomará pronto.
              </p>
            </div>

            <div className="p-lg bg-primary-50 rounded-lg border-2 border-primary-300 mb-xl">
              <p className="caption text-primary-700 mb-xs">
                🔐 PIN de verificación
              </p>
              <p className="text-heading-1 text-primary font-bold tracking-widest">
                {createdPin}
              </p>
              <p className="text-xs text-muted mt-sm">
                Comparte este código con la persona que recibirá el paquete
              </p>
            </div>

            <div className="p-md bg-cream rounded-md mb-xl text-left">
              <p className="caption text-ink font-semibold mb-xs">
                ¿Para qué sirve el PIN?
              </p>
              <ul className="text-xs text-slate space-y-xs">
                <li>• El rider te pedirá el PIN al recoger el paquete</li>
                <li>
                  • El destinatario debe conocer el PIN para recibir el paquete
                </li>
                <li>• Comparte el PIN solo con personas de confianza</li>
              </ul>
            </div>

            <Button
              onClick={() => navigate("/user/errands")}
              className="w-full"
            >
              Ver mis favores
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="section-mobile md:section px-lg">
      <div className="mx-auto w-full max-w-[1200px]">
        <h2 className="hidden mb-2xl lg:block">{t.user.createErrandTitle}</h2>
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-0 lg:grid lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.5fr)] lg:items-start lg:gap-xl"
        >
          <div className="order-1 py-2xl lg:hidden">
            <h2 className="mb-xs">{t.user.createErrandTitle}</h2>
            <p className="caption">
              Selecciona origen y destino directamente en el mapa.
            </p>
          </div>

          <div className="order-1 z-20 relative left-1/2 w-screen -translate-x-1/2 lg:order-2 lg:left-auto lg:w-full lg:translate-x-0">
            <RoutePickerMapbox
              value={route}
              onChange={setRoute}
              routePreview={routePreview}
            />
            {routeEstimateError && (
              <p className="px-l pt-sm font-body mx-md text-caption h-section text-error lg:px-0 text-wrap">
                {routeEstimateError}
              </p>
            )}
          </div>

          <section className="order-2 z-10 mt-md flex min-w-0 flex-col gap-lg rounded-t-xl bg-canvas md:px-xl py-2xl lg:order-1 lg:mt-0 lg:rounded-lg lg:border lg:border-hairline-soft">
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
              {...inputRules.description}
              label={t.user.description}
              name="description"
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
