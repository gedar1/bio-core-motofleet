import { useRef, useState } from "react";
import { Geocoder } from "@mapbox/search-js-react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RouteEstimateResponse } from "../../types/api";
import { Button } from "./Button";

export interface RouteLocation {
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface RouteValue {
  readonly origin: RouteLocation | null;
  readonly destination: RouteLocation | null;
}

export type RoutePreview = RouteEstimateResponse;

interface RoutePickerMapboxProps {
  readonly value: RouteValue;
  readonly onChange: (value: RouteValue) => void;
  readonly routePreview?: RoutePreview | null;
}

type PointKind = "origin" | "destination";

type GeocoderFeature = {
  readonly properties: {
    readonly full_address: string;
    readonly coordinates: {
      readonly latitude: number;
      readonly longitude: number;
      readonly routable_points?: ReadonlyArray<{
        readonly latitude: number;
        readonly longitude: number;
      }>;
    };
  };
};

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as
  | string
  | undefined;
const INITIAL_VIEW = { longitude: -75.5812, latitude: 6.2442, zoom: 12 };

type ReverseGeocodingResponse = {
  readonly features?: ReadonlyArray<{
    readonly properties?: { readonly full_address?: string };
    readonly full_address?: string;
    readonly place_formatted?: string;
    readonly name?: string;
  }>;
};

const routeLayer = {
  id: "estimated-route",
  type: "line" as const,
  paint: {
    "line-color": "#fa520f",
    "line-width": 5,
    "line-opacity": 0.85,
  },
};

export const RoutePickerMapbox = ({
  value,
  onChange,
  routePreview = null,
}: RoutePickerMapboxProps) => {
  const mapRef = useRef<MapRef>(null);
  const [activePoint, setActivePoint] = useState<PointKind>("origin");
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("Selecciona el origen en el mapa.");

  const selectLocation = (kind: PointKind, location: RouteLocation) => {
    onChange({ ...value, [kind]: location });
    setMessage("Ubicación seleccionada.");
    if (kind === "origin") setActivePoint("destination");
  };

  const selectCoordinates = async (
    kind: PointKind,
    latitude: number,
    longitude: number,
  ) => {
    const fallbackAddress =
      kind === "origin"
        ? "Punto de recogida seleccionado"
        : "Punto de entrega seleccionado";

    selectLocation(kind, {
      address: fallbackAddress,
      latitude,
      longitude,
    });
    setMessage("Buscando la dirección del punto seleccionado...");

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&country=CO&language=es&access_token=${encodeURIComponent(MAPBOX_PUBLIC_TOKEN ?? "")}`,
      );
      if (!response.ok) return;

      const result = (await response.json()) as ReverseGeocodingResponse;
      const feature = result.features?.[0];
      const address =
        feature?.properties?.full_address ??
        feature?.full_address ??
        feature?.place_formatted ??
        feature?.name;

      if (address) {
        selectLocation(kind, { address, latitude, longitude });
      }
    } catch {
      setMessage(
        "Ubicación seleccionada. No fue posible obtener la dirección.",
      );
    }
  };

  const handleRetrieve = (kind: PointKind) => (feature: GeocoderFeature) => {
    const coordinates =
      feature.properties.coordinates.routable_points?.[0] ??
      feature.properties.coordinates;
    selectLocation(kind, {
      address: feature.properties.full_address,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
    mapRef.current?.flyTo({
      center: [coordinates.longitude, coordinates.latitude],
      zoom: 16,
      duration: 800,
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Tu navegador no permite obtener la ubicación actual.");
      return;
    }

    setLocating(true);
    setMessage("Obteniendo tu ubicación...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        selectLocation("origin", {
          address: "Ubicación actual",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 16,
          duration: 800,
        });
      },
      (error) => {
        setLocating(false);
        let reason =
          "Tu ubicación no está disponible. Selecciona el origen en el mapa.";
        if (error.code === error.PERMISSION_DENIED) {
          reason =
            "Activa el permiso de ubicación del navegador para continuar.";
        } else if (error.code === error.TIMEOUT) {
          reason =
            "Se agotó el tiempo al obtener tu ubicación. Inténtalo de nuevo.";
        }
        setMessage(reason);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const routeData = routePreview
    ? {
        type: "Feature" as const,
        properties: {},
        geometry: routePreview.geometry,
      }
    : null;

  if (!MAPBOX_PUBLIC_TOKEN) {
    return (
      <p className="font-body text-caption text-error">
        Falta configurar VITE_MAPBOX_PUBLIC_TOKEN para mostrar el mapa.
      </p>
    );
  }

  return (
    <fieldset className="w-full flex flex-col gap-sm">
      <legend className="flex justify-around w-full items-center p-xs font-body text-body-md-medium text-ink">
        Ruta
        <Button
          type="button"
          variant="dark"
          onClick={useCurrentLocation}
          disabled={locating}
        >
          {locating ? "Ubicando..." : "Usar mi ubicación actual como origen"}
        </Button>
      </legend>
      <div className="route-picker-mapbox">
        <div className="route-picker-mapbox-search">
          <div
            className="route-picker-mapbox-search-field"
            onFocusCapture={() => setActivePoint("origin")}
          >
            <Geocoder
              accessToken={MAPBOX_PUBLIC_TOKEN}
              options={{
                country: "CO",
                language: "es",
                proximity: { lng: -75.5812, lat: 6.2442 },
              }}
              placeholder="Busca el punto de recogida"
              marker={false}
              onRetrieve={handleRetrieve("origin")}
            />
          </div>
          <div
            className="route-picker-mapbox-search-field"
            onFocusCapture={() => setActivePoint("destination")}
          >
            <Geocoder
              accessToken={MAPBOX_PUBLIC_TOKEN}
              options={{
                country: "CO",
                language: "es",
                proximity: { lng: -75.5812, lat: 6.2442 },
              }}
              placeholder="Busca el destino"
              marker={false}
              onRetrieve={handleRetrieve("destination")}
            />
          </div>
        </div>
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW}
          mapboxAccessToken={MAPBOX_PUBLIC_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          touchZoomRotate
          onClick={(event) =>
            selectCoordinates(activePoint, event.lngLat.lat, event.lngLat.lng)
          }
        >
          <NavigationControl position="top-right" showCompass={false} />
          {value.origin && (
            <Marker
              longitude={value.origin.longitude}
              latitude={value.origin.latitude}
              color="#16803a"
              draggable
              onDragEnd={(event) =>
                selectCoordinates("origin", event.lngLat.lat, event.lngLat.lng)
              }
            />
          )}
          {value.destination && (
            <Marker
              longitude={value.destination.longitude}
              latitude={value.destination.latitude}
              color="#fa520f"
              draggable
              onDragEnd={(event) =>
                selectCoordinates(
                  "destination",
                  event.lngLat.lat,
                  event.lngLat.lng,
                )
              }
            />
          )}
          {routeData && (
            <Source id="estimated-route-source" type="geojson" data={routeData}>
              <Layer {...routeLayer} />
            </Source>
          )}
        </Map>
      </div>
      <p className="caption p-xs border-sunshine-800 border-solid border m-xs rounded-md">
        Busca el origen y el destino arriba. Toca el mapa o arrastra los pines
        para ajustar cada punto.
      </p>
      {value.origin && (
        <p className="font-body text-body-sm text-ink p-xs">
          <strong>Origen:</strong> {value.origin.address}
        </p>
      )}
      {value.destination && (
        <p className="font-body text-body-sm text-ink p-xs">
          <strong>Destino:</strong> {value.destination.address}
        </p>
      )}
      {routePreview && (
        <p className="font-body text-body-sm-medium text-primary">
          Ruta estimada: {routePreview.distanceKm.toFixed(1)} km ·{" "}
          {Math.ceil(routePreview.durationMinutes)} min aprox.
        </p>
      )}
      <p className="caption p-xs m-xs rounded-md">{message}</p>
    </fieldset>
  );
};
