import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useErrandActions } from "../../hooks";
import {
  RoutePickerMapbox,
  type RouteLocation,
  type RoutePreview,
  type RouteValue,
} from "../../components/ui";
import type { ErrandQuoteResponse } from "../../types/api";
import { QuotePrice } from "./components/QuotePrice";
import { CreateErrandFormPanel } from "./createErrand/CreateErrandFormPanel";
import { CreateErrandSuccess } from "./createErrand/CreateErrandSuccess";
import type { CreateErrandForm } from "./createErrand/types";

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
  const [quoteAccepted, setQuoteAccepted] = useState(false);
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
  const formSectionRef = useRef<HTMLDivElement>(null);

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
      setQuoteAccepted(false);
      setRouteEstimateError(null);
      return () => {
        current = false;
      };
    }

    setRoutePreview(null);
    setQuotePreview(null);
    setQuoteAccepted(false);
    setRouteEstimateError(null);
    const originCoordinates = toRoutingCoordinates(origin);
    const destinationCoordinates = toRoutingCoordinates(destination);
    quote({
      type: form.type,
      origin: originCoordinates,
      destination: destinationCoordinates,
      originExact: {
        latitude: origin.latitude,
        longitude: origin.longitude,
      },
      destinationExact: {
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
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

  const handleAcceptQuote = () => {
    if (!quotePreview) return;

    if (new Date(quotePreview.expiresAt).getTime() <= Date.now()) {
      setQuotePreview(null);
      setQuoteAccepted(false);
      setQuoteRefreshKey((previous) => previous + 1);
      setError(
        "La cotización venció. Revisa el nuevo valor antes de continuar.",
      );
      return;
    }

    setError(null);
    setQuoteAccepted(true);
  };

  useEffect(() => {
    if (!quoteAccepted) return;

    const frameId = window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [quoteAccepted]);

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
      setError("Espera la cotización antes de continuar.");
      return;
    }

    if (!quoteAccepted) {
      setError("Acepta el precio antes de crear el favor.");
      return;
    }

    if (new Date(quotePreview.expiresAt).getTime() <= Date.now()) {
      setQuotePreview(null);
      setQuoteAccepted(false);
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

  if (createdPin) {
    return (
      <CreateErrandSuccess
        pin={createdPin}
        onViewErrands={() => navigate("/user/errands")}
      />
    );
  }

  return (
    <div className="min-h-[calc(100dvh-128px)] w-full lg:min-h-[calc(100dvh-64px)]">
      <div className="w-full">
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-md">
          <div className="relative z-20 w-full">
            <RoutePickerMapbox
              value={route}
              onChange={setRoute}
              routePreview={routePreview}
            />
            {routeEstimateError && (
              <p className="mx-md h-section px-l pt-sm font-body text-caption text-error text-wrap lg:mx-0 lg:px-0">
                {routeEstimateError}
              </p>
            )}
            <div className="mx-auto mt-sm w-full max-w-[720px] px-md lg:px-0">
              <QuotePrice
                quotePreview={quotePreview}
                route={route}
                error={quoteAccepted ? null : error}
                loading={loading}
                accepted={quoteAccepted}
                onAccept={handleAcceptQuote}
              />
            </div>
          </div>

          {quoteAccepted && (
            <div
              ref={formSectionRef}
              className="mx-auto w-full max-w-[720px] scroll-mt-20 px-md lg:px-0"
            >
              <CreateErrandFormPanel
                form={form}
                error={error}
                loading={loading}
                onTypeChange={handleChange("type")}
                onDescriptionChange={handleChange("description")}
                onPaymentMethodChange={handleChange("payment_method")}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
