import { useRef, useState } from "react";
import { Geocoder } from "@mapbox/search-js-react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/mapbox";
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

  const selectCoordinates = (
    kind: PointKind,
    latitude: number,
    longitude: number,
  ) => {
    selectLocation(kind, {
      address:
        kind === "origin"
          ? "Punto de recogida seleccionado"
          : "Punto de entrega seleccionado",
      latitude,
      longitude,
    });
  };

  const handleRetrieve = (feature: GeocoderFeature) => {
    const coordinates =
      feature.properties.coordinates.routable_points?.[0] ??
      feature.properties.coordinates;
    selectLocation(activePoint, {
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
      <legend className="block font-body text-body-sm-medium text-ink">
        Ruta del favor
      </legend>
      <div className="grid grid-cols-2 gap-sm">
        <Button
          type="button"
          variant={activePoint === "origin" ? "dark" : "secondary"}
          onClick={() => setActivePoint("origin")}
        >
          Seleccionar origen
        </Button>
        <Button
          type="button"
          variant={activePoint === "destination" ? "dark" : "secondary"}
          onClick={() => setActivePoint("destination")}
        >
          Seleccionar destino
        </Button>
      </div>
      <Geocoder
        accessToken={MAPBOX_PUBLIC_TOKEN}
        options={{
          country: "CO",
          language: "es",
          proximity: { lng: -75.5812, lat: 6.2442 },
        }}
        placeholder={
          activePoint === "origin"
            ? "Busca el punto de recogida"
            : "Busca el destino"
        }
        marker={false}
        onRetrieve={handleRetrieve}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={useCurrentLocation}
        disabled={locating}
      >
        {locating ? "Ubicando..." : "Usar mi ubicación actual como origen"}
      </Button>
      <div className="route-picker-mapbox">
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW}
          mapboxAccessToken={MAPBOX_PUBLIC_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onClick={(event) =>
            selectCoordinates(activePoint, event.lngLat.lat, event.lngLat.lng)
          }
        >
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
      <p className="caption">
        Selecciona origen o destino y luego toca el mapa. Puedes arrastrar los
        pines para ajustarlos.
      </p>
      {value.origin && (
        <p className="font-body text-body-sm text-ink">
          <strong>Origen:</strong> {value.origin.address}
        </p>
      )}
      {value.destination && (
        <p className="font-body text-body-sm text-ink">
          <strong>Destino:</strong> {value.destination.address}
        </p>
      )}
      {routePreview && (
        <p className="font-body text-body-sm-medium text-primary">
          Ruta estimada: {routePreview.distanceKm.toFixed(1)} km ·{" "}
          {Math.ceil(routePreview.durationMinutes)} min aprox.
        </p>
      )}
      <p className="caption">{message}</p>
    </fieldset>
  );
};
