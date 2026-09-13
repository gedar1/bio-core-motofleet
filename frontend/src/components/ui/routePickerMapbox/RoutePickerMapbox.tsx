import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import "./routePickerMapbox.css";
import {
  classifyAddressResolution,
  CURRENT_LOCATION_ADDRESS,
  getOverlayMode,
  getPointLabel,
  getStage,
  getSelectedSearchBoxLabel,
  isAddressResolutionPending,
  MAP_SELECTION_FALLBACK_ADDRESS,
  resolveDisplayAddress,
  shouldShowMap,
} from "./RoutePickerMapbox.helpers";
import type {
  PointKind,
  RouteLocation,
  RoutePickerMapboxProps,
  SearchBoxRetrieveResponse,
} from "./RoutePickerMapbox.types";
import { CollapsedPointsSummary } from "./components/CollapsedPointsSummary";
import { useMarkerClickSuppression } from "./hooks/useMarkerClickSuppression";
import { useRouteMapCamera } from "./hooks/useRouteMapCamera";
import { RouteMapMarker } from "./components/RouteMapMarker";
import { RoutePickerHelpButton } from "./components/RoutePickerHelpButton";
import { RoutePointOverlay } from "./components/RoutePointOverlay";
import { RoutePointSearch } from "./components/RoutePointSearch";
import { Icon } from "@/components/shared/components/Icon";

export type {
  RouteLocation,
  RoutePickerMapboxProps,
  RoutePreview,
  RouteValue,
} from "./RoutePickerMapbox.types";

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as
  | string
  | undefined;
const INITIAL_VIEW = { longitude: -75.5812, latitude: 6.2442, zoom: 12 };
const CONFIRMATION_TOAST_DURATION_MS = 2600;

const routeLayer = {
  id: "estimated-route",
  type: "line" as const,
  paint: {
    "line-color": "#fa520f",
    "line-width": 5,
    "line-opacity": 0.85,
  },
};

type ReverseGeocodingResponse = {
  readonly features?: ReadonlyArray<{
    readonly properties?: { readonly full_address?: string };
    readonly full_address?: string;
    readonly place_formatted?: string;
    readonly name?: string;
  }>;
};

/**
 * Coordinates route capture state, map behavior, and the domain callbacks.
 * Presentation is delegated to cohesive components in ./components.
 */
export const RoutePickerMapbox = ({
  value,
  onChange,
  routePreview = null,
}: RoutePickerMapboxProps) => {
  const mapRef = useRef<MapRef>(null);
  const legendRef = useRef<HTMLLegendElement>(null);
  const valueRef = useRef(value);
  const reverseGeocodingRequestRef = useRef<Record<PointKind, number>>({
    origin: 0,
    destination: 0,
  });
  const [activeOverlayKind, setActiveOverlayKind] = useState<PointKind | null>(
    null,
  );
  const [locating, setLocating] = useState(false);
  // Only used for actionable states: search errors, geolocation issues, or
  // hints while a point isn't confirmed yet. Successful confirmation is
  // communicated via a transient toast instead of a persistent message.
  const [message, setMessage] = useState<string | null>(null);
  const [confirmationToast, setConfirmationToast] = useState<string | null>(
    null,
  );
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [searchValues, setSearchValues] = useState<Record<PointKind, string>>({
    origin: "",
    destination: "",
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const {
    onMarkerDragStart,
    shouldSuppressMarkerClick,
    suppressMarkerClickAfterDrag,
  } = useMarkerClickSuppression();
  const {
    fitConfirmedRoute,
    focusPendingCounterpart,
    onMapLoad,
    resetConfirmedRouteFit,
  } = useRouteMapCamera({
    mapRef,
    value,
  });
  const mapboxAccessToken = MAPBOX_PUBLIC_TOKEN ?? "";

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  const closeOverlay = useCallback(() => {
    setActiveOverlayKind(null);
    legendRef.current?.focus();
  }, []);

  const openOverlay = useCallback(
    (kind: PointKind) => {
      if (!value[kind]) return;

      if (activeOverlayKind === kind) {
        closeOverlay();
        return;
      }

      setActiveOverlayKind(kind);
    },
    [activeOverlayKind, closeOverlay, value],
  );

  useEffect(() => {
    if (activeOverlayKind && !value[activeOverlayKind]) {
      closeOverlay();
    }
  }, [activeOverlayKind, closeOverlay, value.destination, value.origin]);

  const showConfirmationToast = useCallback((text: string) => {
    setConfirmationToast(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setConfirmationToast(null);
    }, CONFIRMATION_TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    if (value.origin?.confirmed && value.destination?.confirmed) {
      setIsSearchExpanded(false);
    }
  }, [value.origin?.confirmed, value.destination?.confirmed]);

  const selectLocation = (kind: PointKind, location: RouteLocation) => {
    const nextValue = { ...valueRef.current, [kind]: location };
    valueRef.current = nextValue;
    onChange(nextValue);
    setSearchValues((previous) => ({
      ...previous,
      [kind]: location.inputAddress,
    }));
    setMessage(null);
  };

  const invalidateReverseGeocoding = (kind: PointKind) => {
    reverseGeocodingRequestRef.current[kind] += 1;
  };

  const clearLocation = (kind: PointKind) => {
    invalidateReverseGeocoding(kind);
    const nextValue = { ...valueRef.current, [kind]: null };
    valueRef.current = nextValue;
    onChange(nextValue);
    setSearchValues((previous) => ({ ...previous, [kind]: "" }));
    setIsSearchExpanded(true);
    setMessage(null);
  };

  const resetRoute = () => {
    invalidateReverseGeocoding("origin");
    invalidateReverseGeocoding("destination");
    resetConfirmedRouteFit();
    const nextValue = { origin: null, destination: null };
    valueRef.current = nextValue;
    onChange(nextValue);
    setSearchValues({ origin: "", destination: "" });
    setIsSearchExpanded(true);
    setMessage(null);
  };

  const handleSearchChange = (kind: PointKind) => (nextValue: string) => {
    setSearchValues((previous) => ({ ...previous, [kind]: nextValue }));
    const currentLocation = value[kind];
    if (
      currentLocation &&
      activeOverlayKind !== kind &&
      nextValue.trim() !== currentLocation.inputAddress &&
      nextValue.trim() !== currentLocation.address
    ) {
      invalidateReverseGeocoding(kind);
      const nextRouteValue = { ...valueRef.current, [kind]: null };
      valueRef.current = nextRouteValue;
      onChange(nextRouteValue);
    }
  };

  const handleSearchClear = (kind: PointKind) => () => {
    clearLocation(kind);
  };

  const updateInstructions = (kind: PointKind, instructions: string) => {
    const location = value[kind];
    if (!location) return;
    const nextValue = {
      ...valueRef.current,
      [kind]: { ...location, instructions },
    };
    valueRef.current = nextValue;
    onChange(nextValue);
  };

  const confirmLocation = (kind: PointKind) => {
    const location = value[kind];
    if (!location || isAddressResolutionPending(kind, location)) return;

    // A materially different pin address replaces the rider's operational
    // label. inputAddress remains unchanged for audit and rider context.
    const confirmedAddress = resolveDisplayAddress(kind, location);
    const confirmedLocation = {
      ...location,
      address: confirmedAddress,
      confirmed: true,
    };
    const nextValue = { ...valueRef.current, [kind]: confirmedLocation };
    valueRef.current = nextValue;
    onChange(nextValue);
    setSearchValues((previous) => ({
      ...previous,
      [kind]: confirmedLocation.inputAddress,
    }));
    showConfirmationToast(
      kind === "origin"
        ? "Punto de recogida confirmado"
        : "Punto de entrega confirmado",
    );

    if (!fitConfirmedRoute(nextValue, kind)) {
      focusPendingCounterpart(kind);
    }

    closeOverlay();
  };

  const selectCoordinates = async (
    kind: PointKind,
    latitude: number,
    longitude: number,
  ) => {
    const previousLocation = valueRef.current[kind];
    const inputAddress =
      searchValues[kind].trim() ||
      previousLocation?.inputAddress ||
      MAP_SELECTION_FALLBACK_ADDRESS[kind];
    const referenceKind = previousLocation?.referenceKind ?? "address";
    const requestId = reverseGeocodingRequestRef.current[kind] + 1;
    reverseGeocodingRequestRef.current[kind] = requestId;

    const pendingLocation: RouteLocation = {
      address: inputAddress,
      inputAddress,
      resolvedAddress: null,
      latitude,
      longitude,
      routableLatitude: latitude,
      routableLongitude: longitude,
      instructions: previousLocation?.instructions,
      referenceKind,
      addressResolution: "pending",
      confirmed: false,
    };
    selectLocation(kind, pendingLocation);

    const markUnresolved = () => {
      if (reverseGeocodingRequestRef.current[kind] !== requestId) return;
      selectLocation(kind, {
        ...pendingLocation,
        addressResolution: "unresolved",
      });
    };

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&country=CO&language=es&access_token=${encodeURIComponent(mapboxAccessToken)}`,
      );
      if (reverseGeocodingRequestRef.current[kind] !== requestId) return;
      if (!response.ok) {
        markUnresolved();
        return;
      }

      const result = (await response.json()) as ReverseGeocodingResponse;
      if (reverseGeocodingRequestRef.current[kind] !== requestId) return;
      const feature = result.features?.[0];
      const resolvedAddress =
        feature?.properties?.full_address ??
        feature?.full_address ??
        feature?.place_formatted ??
        feature?.name ??
        null;

      if (!resolvedAddress) {
        markUnresolved();
        return;
      }

      const resolvedLocation: RouteLocation = {
        ...pendingLocation,
        resolvedAddress,
        addressResolution: classifyAddressResolution(kind, {
          inputAddress,
          resolvedAddress,
          referenceKind,
        }),
      };
      selectLocation(kind, resolvedLocation);
    } catch {
      markUnresolved();
      if (reverseGeocodingRequestRef.current[kind] === requestId) {
        setMessage(
          `Punto de ${getPointLabel(kind)} seleccionado. No fue posible obtener la dirección; revisa el pin y confírmalo.`,
        );
      }
    }
  };

  const handleRetrieve =
    (kind: PointKind) => (response: SearchBoxRetrieveResponse) => {
      const feature = response.features[0];
      if (!feature) {
        setMessage(
          "No fue posible obtener el lugar seleccionado. Inténtalo de nuevo.",
        );
        return;
      }

      invalidateReverseGeocoding(kind);
      const { latitude, longitude } = feature.properties.coordinates;
      const routablePoint = feature.properties.coordinates.routable_points?.[0];
      const usesDifferentRoutablePoint =
        routablePoint !== undefined &&
        (routablePoint.latitude !== latitude ||
          routablePoint.longitude !== longitude);
      const isPointOfInterest = feature.properties.feature_type === "poi";
      const referenceKind = isPointOfInterest ? "poi" : "address";
      const resolvedAddress = getSelectedSearchBoxLabel(feature);
      const inputAddress = isPointOfInterest
        ? resolvedAddress
        : searchValues[kind].trim() || resolvedAddress;
      const locationBase = {
        address: inputAddress,
        inputAddress,
        resolvedAddress,
        latitude,
        longitude,
        routableLatitude: routablePoint?.latitude ?? latitude,
        routableLongitude: routablePoint?.longitude ?? longitude,
        instructions: valueRef.current[kind]?.instructions,
        referenceKind,
        confirmed: false,
      } as const;

      selectLocation(kind, {
        ...locationBase,
        addressResolution: classifyAddressResolution(kind, locationBase),
      });
      setMessage(
        usesDifferentRoutablePoint
          ? "La dirección tiene un acceso vial distinto. Revisa el pin y confirma el punto."
          : null,
      );
    };

  const handleSuggestError = () => {
    setMessage(
      "No fue posible cargar coincidencias. Revisa la dirección o inténtalo de nuevo.",
    );
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
        invalidateReverseGeocoding("origin");
        setLocating(false);
        const address = CURRENT_LOCATION_ADDRESS;
        selectLocation("origin", {
          address,
          inputAddress: address,
          resolvedAddress: null,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          routableLatitude: position.coords.latitude,
          routableLongitude: position.coords.longitude,
          instructions: valueRef.current.origin?.instructions,
          referenceKind: "address",
          addressResolution: "pin_only",
          confirmed: false,
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

  const renderPointArea = (kind: PointKind) => (
    <RoutePointSearch
      kind={kind}
      location={value[kind]}
      accessToken={mapboxAccessToken}
      searchValue={searchValues[kind]}
      locating={locating}
      onSearchChange={handleSearchChange(kind)}
      onSearchClear={handleSearchClear(kind)}
      onRetrieve={handleRetrieve(kind)}
      onSuggestError={handleSuggestError}
      onUseCurrentLocation={useCurrentLocation}
      onClearLocation={() => clearLocation(kind)}
      onOpenOverlay={() => openOverlay(kind)}
    />
  );

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

  const stage = getStage(value);
  const activeOverlayMode =
    activeOverlayKind && value[activeOverlayKind]
      ? getOverlayMode(activeOverlayKind, value)
      : null;

  return (
    <fieldset className="w-full flex flex-col gap-sm">
      <legend
        ref={legendRef}
        tabIndex={-1}
        className="flex w-full flex-col items-center justify-center gap-xxs pb-md text-center font-body text-body-md-medium text-ink"
      >
        <span className="flex items-center gap-sm">
          <span>¿A dónde necesitas enviar algo?</span>
          <RoutePickerHelpButton
            isOpen={isHelpOpen}
            onToggle={() => setIsHelpOpen((previous) => !previous)}
          />
          {(value.origin || value.destination) && (
            <button
              type="button"
              className="route-picker-mapbox-reset-button"
              onClick={resetRoute}
            >
              <Icon name="refresh_ccw_dot" size={30} />
            </button>
          )}
        </span>
        <span className="caption text-muted">
          {!value.origin?.confirmed
            ? "Indica y confirma el punto de recogida."
            : "Ahora indica y confirma el punto de entrega."}
        </span>
        {isHelpOpen && (
          <p className="route-picker-mapbox-help-popover caption text-muted">
            Selecciona una sugerencia o arrastra los pines para reubicarlos. La
            ruta usará el acceso vial más cercano, pero el rider verá el punto
            exacto y tus instrucciones.
          </p>
        )}
      </legend>
      {shouldShowMap(value) ? (
        <div
          className={`route-picker-mapbox${
            activeOverlayMode === "edit"
              ? " route-picker-mapbox--edit-open"
              : ""
          }`}
        >
          <div className="route-picker-mapbox-search">
            {isSearchExpanded ? (
              <>
                {renderPointArea("origin")}
                {renderPointArea("destination")}
              </>
            ) : (
              <CollapsedPointsSummary
                value={value}
                onEdit={() => setIsSearchExpanded(true)}
              />
            )}
          </div>
          <Map
            ref={mapRef}
            initialViewState={INITIAL_VIEW}
            mapboxAccessToken={mapboxAccessToken}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            dragPan
            scrollZoom
            doubleClickZoom
            touchZoomRotate
            onLoad={onMapLoad}
            onClick={() => {
              if (activeOverlayKind) closeOverlay();
            }}
          >
            <NavigationControl position="top-right" showCompass={false} />
            {value.origin && (
              <RouteMapMarker
                kind="origin"
                location={value.origin}
                value={value}
                color="#16803a"
                activeOverlayKind={activeOverlayKind}
                onDragStart={onMarkerDragStart}
                onDragEnd={(latitude, longitude) => {
                  suppressMarkerClickAfterDrag();
                  selectCoordinates("origin", latitude, longitude);
                }}
                onClick={() => {
                  if (shouldSuppressMarkerClick()) return;
                  openOverlay("origin");
                }}
              />
            )}
            {value.destination && (
              <RouteMapMarker
                kind="destination"
                location={value.destination}
                value={value}
                color="#fa520f"
                activeOverlayKind={activeOverlayKind}
                onDragStart={onMarkerDragStart}
                onDragEnd={(latitude, longitude) => {
                  suppressMarkerClickAfterDrag();
                  selectCoordinates("destination", latitude, longitude);
                }}
                onClick={() => {
                  if (shouldSuppressMarkerClick()) return;
                  openOverlay("destination");
                }}
              />
            )}
            {routeData && (
              <Source
                id="estimated-route-source"
                type="geojson"
                data={routeData}
              >
                <Layer {...routeLayer} />
              </Source>
            )}
          </Map>
          {activeOverlayKind &&
            value[activeOverlayKind] &&
            activeOverlayMode && (
              <RoutePointOverlay
                kind={activeOverlayKind}
                mode={activeOverlayMode}
                location={value[activeOverlayKind]}
                accessToken={mapboxAccessToken}
                searchValue={searchValues[activeOverlayKind]}
                onSearchChange={handleSearchChange(activeOverlayKind)}
                onSearchClear={handleSearchClear(activeOverlayKind)}
                onRetrieve={handleRetrieve(activeOverlayKind)}
                onSuggestError={handleSuggestError}
                onInstructionsChange={(instructions) =>
                  updateInstructions(activeOverlayKind, instructions)
                }
                onConfirm={() => confirmLocation(activeOverlayKind)}
                onClose={closeOverlay}
              />
            )}
          {confirmationToast && (
            <p
              className="route-picker-mapbox-toast"
              role="status"
              aria-live="polite"
            >
              ✓ {confirmationToast}
            </p>
          )}
        </div>
      ) : (
        <div className="route-picker-mapbox-precapture">
          {renderPointArea("origin")}
          {stage === "capture-destination" && renderPointArea("destination")}
        </div>
      )}
      {routePreview && (
        <p className="font-body text-body-sm-medium text-primary p-xs">
          Ruta estimada: {routePreview.distanceKm.toFixed(1)} km ·{" "}
          {Math.ceil(routePreview.durationMinutes)} min aprox.
        </p>
      )}
      {message && (
        <p className="caption p-xs m-xs rounded-md text-warning">{message}</p>
      )}
    </fieldset>
  );
};
