import { useEffect, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Errand } from "../../hooks/useErrands";
import type { RouteEstimateResponse } from "../../types/api";
import { useErrandActions } from "../../hooks";
import { Button } from "./Button";

interface RiderRouteActionsProps {
  readonly errand: Errand;
  readonly navigationTarget?: "origin" | "destination";
  readonly mobileMapFirst?: boolean;
  readonly autoLoadOnMobile?: boolean;
}

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as
  | string
  | undefined;

const routeLayer = {
  id: "rider-estimated-route",
  type: "line" as const,
  paint: {
    "line-color": "#fa520f",
    "line-width": 5,
    "line-opacity": 0.85,
  },
};

const getNavigationUrl = (
  provider: "google" | "waze",
  latitude: number,
  longitude: number,
) => {
  const coordinates = `${latitude},${longitude}`;
  if (provider === "google") {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}&travelmode=driving`;
  }

  return `https://waze.com/ul?ll=${encodeURIComponent(coordinates)}&navigate=yes`;
};

export const RiderRouteActions = ({
  errand,
  navigationTarget,
  mobileMapFirst = false,
  autoLoadOnMobile = false,
}: RiderRouteActionsProps) => {
  const { getRoutePreview } = useErrandActions();
  const [routePreview, setRoutePreview] =
    useState<RouteEstimateResponse | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const originLatitude = errand.origin_lat;
  const originLongitude = errand.origin_lng;
  const destinationLatitude = errand.destination_lat;
  const destinationLongitude = errand.destination_lng;
  const hasCoordinates =
    originLatitude != null &&
    originLongitude != null &&
    destinationLatitude != null &&
    destinationLongitude != null;

  useEffect(() => {
    if (
      !autoLoadOnMobile ||
      !hasCoordinates ||
      routePreview ||
      !MAPBOX_PUBLIC_TOKEN ||
      !window.matchMedia("(max-width: 1023px)").matches
    ) {
      return;
    }

    let active = true;
    setLoading(true);
    getRoutePreview(errand.id)
      .then((preview) => {
        if (!active) return;
        setRoutePreview(preview);
        setIsMapVisible(true);
      })
      .catch(() => {
        if (active) {
          setMessage(
            "No fue posible cargar la ruta de Mapbox. Inténtalo de nuevo.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    autoLoadOnMobile,
    errand.id,
    getRoutePreview,
    hasCoordinates,
    routePreview,
  ]);

  if (
    originLatitude == null ||
    originLongitude == null ||
    destinationLatitude == null ||
    destinationLongitude == null
  ) {
    return (
      <p className="caption mt-sm">
        La ubicación precisa de este mandado no está disponible.
      </p>
    );
  }

  const origin = { latitude: originLatitude, longitude: originLongitude };
  const destination = {
    latitude: destinationLatitude,
    longitude: destinationLongitude,
  };

  const loadRoute = async () => {
    if (routePreview) {
      setIsMapVisible(true);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      setRoutePreview(await getRoutePreview(errand.id));
      setIsMapVisible(true);
    } catch {
      setMessage(
        "No fue posible cargar la ruta de Mapbox. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const target = navigationTarget === "origin" ? origin : destination;
  const targetAddress =
    navigationTarget === "origin"
      ? errand.origin_address
      : errand.destination_address;
  const targetLabel = navigationTarget === "origin" ? "recogida" : "entrega";

  const copyLocation = async () => {
    const mapUrl = `https://www.google.com/maps?q=${target.latitude},${target.longitude}`;
    try {
      await navigator.clipboard.writeText(
        `${targetAddress}\n${target.latitude}, ${target.longitude}\n${mapUrl}`,
      );
      setMessage(`Ubicación de ${targetLabel} copiada.`);
    } catch {
      setMessage("No fue posible copiar la ubicación en este navegador.");
    }
  };

  const routeData = routePreview
    ? {
        type: "Feature" as const,
        properties: {},
        geometry: routePreview.geometry,
      }
    : null;
  const sectionClassName = mobileMapFirst
    ? "order-1 mt-0 flex flex-col gap-sm lg:order-2 lg:mt-lg"
    : "mt-lg flex flex-col gap-sm";

  return (
    <section className={sectionClassName} aria-label="Ruta del mandado">
      {!isMapVisible && (
        <Button
          type="button"
          variant="secondary"
          onClick={loadRoute}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? "Cargando ruta..." : "Ver ruta Mapbox"}
        </Button>
      )}
      {isMapVisible && routePreview && MAPBOX_PUBLIC_TOKEN && (
        <>
          <div className="rider-route-map">
            <Map
              initialViewState={{
                longitude: (origin.longitude + destination.longitude) / 2,
                latitude: (origin.latitude + destination.latitude) / 2,
                zoom: 12,
              }}
              mapboxAccessToken={MAPBOX_PUBLIC_TOKEN}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              touchZoomRotate
              scrollZoom={false}
            >
              <NavigationControl position="top-right" showCompass={false} />
              <Marker
                longitude={origin.longitude}
                latitude={origin.latitude}
                color="#16803a"
              />
              <Marker
                longitude={destination.longitude}
                latitude={destination.latitude}
                color="#fa520f"
              />
              {routeData && (
                <Source
                  id="rider-estimated-route-source"
                  type="geojson"
                  data={routeData}
                >
                  <Layer {...routeLayer} />
                </Source>
              )}
            </Map>
          </div>
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
            <p className="font-body text-body-sm-medium text-primary">
              Ruta Mapbox: {routePreview.distanceKm.toFixed(1)} km ·{" "}
              {Math.ceil(routePreview.durationMinutes)} min aprox.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:ml-auto sm:w-auto"
              onClick={() => setIsMapVisible(false)}
            >
              Cerrar mapa
            </Button>
          </div>
        </>
      )}
      {navigationTarget && (
        <div className="flex flex-col gap-sm sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="dark"
            className="w-full sm:w-auto"
            onClick={() =>
              window.open(
                getNavigationUrl("google", target.latitude, target.longitude),
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            Google Maps a {targetLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() =>
              window.open(
                getNavigationUrl("waze", target.latitude, target.longitude),
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            Waze a {targetLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={copyLocation}
          >
            Copiar ubicación
          </Button>
        </div>
      )}
      {message && <p className="caption">{message}</p>}
    </section>
  );
};
