import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ComponentProps,
} from "react";
import { SearchBox } from "@mapbox/search-js-react";
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
import {
  getDiscrepancySeverity,
  getOverlayMode,
  getStage,
  hasAddressDiscrepancy,
  isAffordanceVisible,
  isEditHintVisible,
  resolveDisplayAddress,
  shouldShowMap,
  type OverlayMode,
  type PointKind,
} from "./RoutePickerMapbox.helpers";

export interface RouteLocation {
  /** Address label confirmed by the user and shown to the rider. */
  readonly address: string;
  /** Text originally entered by the user, before geocoder normalization. */
  readonly inputAddress: string;
  /** Address returned by the geocoder, when one exists. */
  readonly resolvedAddress: string | null;
  /** Exact pin selected by the user or returned by the geocoder. */
  readonly latitude: number;
  readonly longitude: number;
  /** Road-access coordinates used for routing and navigation. */
  readonly routableLatitude?: number;
  readonly routableLongitude?: number;
  /** Instructions for the rider at this point. */
  readonly instructions?: string;
  /** The user explicitly confirmed this point. */
  readonly confirmed: boolean;
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

type SearchBoxRetrieveResponse = Parameters<
  NonNullable<ComponentProps<typeof SearchBox>["onRetrieve"]>
>[0];
type SearchBoxRetrieveFeature = SearchBoxRetrieveResponse["features"][number];

/**
 * Search Box identifies POIs explicitly. Their typed name is not part of
 * `full_address`, so retain both the place label and its supplied context.
 */
const getSelectedSearchBoxLabel = (
  feature: SearchBoxRetrieveFeature,
): string => {
  const { feature_type, full_address, name, name_preferred } =
    feature.properties;

  return feature_type === "poi"
    ? `${name_preferred || name}, ${full_address}`
    : full_address;
};

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as
  | string
  | undefined;
const INITIAL_VIEW = { longitude: -75.5812, latitude: 6.2442, zoom: 12 };
const ROUTE_FIT_PADDING = { top: 180, right: 56, bottom: 128, left: 56 };
const ROUTE_FIT_MAX_ZOOM = 15;
const ROUTE_FIT_DURATION_MS = 600;

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

const hasSeparateRoutablePoint = (location: RouteLocation): boolean =>
  location.routableLatitude !== undefined &&
  location.routableLongitude !== undefined &&
  (location.routableLatitude !== location.latitude ||
    location.routableLongitude !== location.longitude);

/** Placeholder text used when a point is chosen by tapping the map/marker instead of typing. */
const MAP_SELECTION_FALLBACK_ADDRESS: Record<PointKind, string> = {
  origin: "Punto de recogida seleccionado",
  destination: "Punto de entrega seleccionado",
};
const CURRENT_LOCATION_ADDRESS = "Ubicación actual";

const COLOMBIAN_ADDRESS_CONTEXT_PATTERN =
  /colombia|medell[ií]n|bogot[aá]|cali|barranquilla|cartagena|pereira|manizales|bucaramanga/i;

const normalizeColombianAddressQuery = (query: string): string => {
  const normalized = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(?:cra|cr|kra|k)\.?\s*/gi, "Carrera ")
    .replace(/\b(?:cl|calle)\.?\s*/gi, "Calle ")
    .replace(/\b(?:av|avda|avenida)\.?\s*/gi, "Avenida ")
    .replace(/\s*#\s*/g, " # ")
    .replace(/\s*-\s*/g, "-");

  if (!normalized || COLOMBIAN_ADDRESS_CONTEXT_PATTERN.test(normalized)) {
    return normalized;
  }

  return `${normalized}, Colombia`;
};

const SEARCH_BOX_OPTIONS = {
  country: "CO",
  language: "es",
  // Search Box includes POIs as well as addresses and streets when `types`
  // is omitted, preserving Calle/Carrera lookup while enabling place names.
  limit: 5,
  proximity: { lng: -75.5812, lat: 6.2442 },
} as const;

const getPointLabel = (kind: PointKind): string =>
  kind === "origin" ? "recogida" : "entrega";

const CONFIRMATION_TOAST_DURATION_MS = 2600;

/** Small "?" trigger that reveals usage tips in a popover instead of a fixed banner. */
const HelpButton = ({
  isOpen,
  onToggle,
}: {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}) => (
  <button
    type="button"
    className="route-picker-mapbox-help-button"
    onClick={onToggle}
    aria-expanded={isOpen}
    aria-label="Ver ayuda para seleccionar puntos"
  >
    ?
  </button>
);

/** Pin that visually distinguishes a confirmed point from one still pending confirmation. */
const RouteMarkerPin = ({
  color,
  confirmed,
}: {
  readonly color: string;
  readonly confirmed: boolean;
}) => (
  <svg
    width="24"
    height="30"
    viewBox="0 0 30 38"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path
      d="M15 0C6.7 0 0 6.7 0 15c0 10.5 12.3 21.3 14 22.7.3.3.7.3 1 0 1.7-1.4 14-12.2 14-22.7C30 6.7 23.3 0 15 0Z"
      fill={color}
      opacity={confirmed ? 1 : 0.55}
    />
    {confirmed ? (
      <path
        d="M9.5 15.5l3.3 3.3 7.2-7.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <circle cx="15" cy="14" r="4.5" fill="#fff" opacity="0.9" />
    )}
  </svg>
);

/**
 * Non-modal overlay shell. Confirm and edit content is added by the following
 * overlay tasks, while this component owns the shared accessibility lifecycle.
 */
const DiscrepancyNotice = ({
  location,
}: {
  readonly location: RouteLocation;
}) => {
  if (!hasAddressDiscrepancy(location)) return null;

  const severity = getDiscrepancySeverity(location);
  const isHouseNumberMismatch = severity === "house_number_mismatch";

  return (
    <p
      className={
        isHouseNumberMismatch
          ? "route-picker-mapbox-discrepancy-high"
          : "route-picker-mapbox-discrepancy-minor"
      }
    >
      {isHouseNumberMismatch ? (
        <>
          ⚠ El número de la dirección no coincide: escribiste{" "}
          <strong>{location.inputAddress}</strong>, pero Mapbox ubicó{" "}
          <strong>{location.resolvedAddress}</strong>. Verifica el pin
          cuidadosamente antes de confirmar.
        </>
      ) : (
        <>
          Mapbox ubicó tu búsqueda en:{" "}
          <strong>{location.resolvedAddress}</strong>.
        </>
      )}
    </p>
  );
};

const RoutePointOverlay = ({
  kind,
  mode,
  location,
  searchValue,
  onSearchChange,
  onSearchClear,
  onRetrieve,
  onSuggestError,
  onInstructionsChange,
  onConfirm,
  onClose,
}: {
  readonly kind: PointKind;
  readonly mode: OverlayMode;
  readonly location: RouteLocation;
  readonly searchValue: string;
  readonly onSearchChange: (nextValue: string) => void;
  readonly onSearchClear: () => void;
  readonly onRetrieve: (response: SearchBoxRetrieveResponse) => void;
  readonly onSuggestError: () => void;
  readonly onInstructionsChange: (instructions: string) => void;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingId = `route-picker-overlay-heading-${kind}`;

  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLElement>("textarea, input, button")
      ?.focus();
  }, [kind, mode]);

  return (
    <div
      ref={containerRef}
      className="route-picker-mapbox-overlay"
      role="region"
      aria-labelledby={headingId}
      aria-live="polite"
      style={{
        position: "absolute",
        zIndex: 4,
        right: 0,
        bottom: 0,
        left: 0,
        maxHeight: "60%",
        overflowY: "auto",
        pointerEvents: "auto",
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="route-picker-mapbox-overlay-header">
        <span id={headingId} className="caption font-semibold text-ink">
          {mode === "edit"
            ? `Cambiar punto de ${getPointLabel(kind)}`
            : `Confirma el punto de ${getPointLabel(kind)}`}
        </span>
        <button
          type="button"
          className="route-picker-mapbox-overlay-close"
          onClick={onClose}
          aria-label="Cerrar panel de punto"
        >
          ×
        </button>
      </div>
      {mode === "edit" ? (
        <SearchBox
          accessToken={MAPBOX_PUBLIC_TOKEN ?? ""}
          options={SEARCH_BOX_OPTIONS}
          value={searchValue}
          onChange={onSearchChange}
          onClear={onSearchClear}
          interceptSearch={normalizeColombianAddressQuery}
          placeholder={`Busca la nueva dirección o lugar de ${getPointLabel(kind)}`}
          marker={false}
          onRetrieve={onRetrieve}
          onSuggestError={onSuggestError}
        />
      ) : (
        <>
          <p className="font-body text-body-sm-medium text-ink">
            {resolveDisplayAddress(kind, location)}
          </p>
          <DiscrepancyNotice location={location} />
          {hasSeparateRoutablePoint(location) && (
            <p className="caption text-muted">
              La ruta {kind === "origin" ? "partirá" : "llegará"} del acceso
              vial más cercano al pin.
            </p>
          )}
          <label className="flex flex-col gap-xxs">
            <span className="caption font-semibold text-ink">
              Instrucciones para el rider (opcional)
            </span>
            <textarea
              className="input-field min-h-20 resize-y"
              maxLength={500}
              value={location.instructions ?? ""}
              onChange={(event) => onInstructionsChange(event.target.value)}
            />
          </label>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={onConfirm}
          >
            Confirmar punto de {getPointLabel(kind)}
          </Button>
        </>
      )}
    </div>
  );
};

export const RoutePickerMapbox = ({
  value,
  onChange,
  routePreview = null,
}: RoutePickerMapboxProps) => {
  const mapRef = useRef<MapRef>(null);
  const legendRef = useRef<HTMLLegendElement>(null);
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
  const isMarkerDraggingRef = useRef(false);
  const suppressMarkerClickRef = useRef(false);
  const markerClickSuppressionTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>();
  const originLatitude = value.origin?.latitude;
  const originLongitude = value.origin?.longitude;
  const destinationLatitude = value.destination?.latitude;
  const destinationLongitude = value.destination?.longitude;

  const fitSelectedRoute = useCallback((): void => {
    if (
      originLatitude === undefined ||
      originLongitude === undefined ||
      destinationLatitude === undefined ||
      destinationLongitude === undefined
    ) {
      return;
    }

    mapRef.current?.fitBounds(
      [
        [originLongitude, originLatitude],
        [destinationLongitude, destinationLatitude],
      ],
      {
        padding: ROUTE_FIT_PADDING,
        maxZoom: ROUTE_FIT_MAX_ZOOM,
        duration: ROUTE_FIT_DURATION_MS,
      },
    );
  }, [
    destinationLatitude,
    destinationLongitude,
    originLatitude,
    originLongitude,
  ]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (markerClickSuppressionTimeoutRef.current) {
        clearTimeout(markerClickSuppressionTimeoutRef.current);
      }
    },
    [],
  );

  const suppressMarkerClickAfterDrag = () => {
    isMarkerDraggingRef.current = false;
    suppressMarkerClickRef.current = true;
    if (markerClickSuppressionTimeoutRef.current) {
      clearTimeout(markerClickSuppressionTimeoutRef.current);
    }
    markerClickSuppressionTimeoutRef.current = setTimeout(() => {
      suppressMarkerClickRef.current = false;
    }, 250);
  };

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
    onChange({ ...value, [kind]: location });
    setSearchValues((previous) => ({
      ...previous,
      [kind]: location.inputAddress,
    }));
    setMessage(null);
  };

  const clearLocation = (kind: PointKind) => {
    onChange({ ...value, [kind]: null });
    setSearchValues((previous) => ({ ...previous, [kind]: "" }));
    setIsSearchExpanded(true);
    setMessage(null);
  };

  const resetRoute = () => {
    onChange({ origin: null, destination: null });
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
      onChange({ ...value, [kind]: null });
    }
  };

  const handleSearchClear = (kind: PointKind) => () => {
    clearLocation(kind);
  };

  const updateInstructions = (kind: PointKind, instructions: string) => {
    const location = value[kind];
    if (!location) return;
    onChange({
      ...value,
      [kind]: { ...location, instructions },
    });
  };

  const confirmLocation = (kind: PointKind) => {
    const location = value[kind];
    if (!location) return;

    // The user's own text is the source of truth for the address shown to
    // the rider, unless the point came from a map tap or GPS (no text
    // typed), in which case the geocoder's resolved address is a better
    // label than a generic placeholder.
    const confirmedAddress = resolveDisplayAddress(kind, location);
    const confirmedLocation = {
      ...location,
      address: confirmedAddress,
      confirmed: true,
    };
    onChange({ ...value, [kind]: confirmedLocation });
    setSearchValues((previous) => ({
      ...previous,
      [kind]: confirmedAddress,
    }));
    showConfirmationToast(
      kind === "origin"
        ? "Punto de recogida confirmado"
        : "Punto de entrega confirmado",
    );

    const counterpart: PointKind = kind === "origin" ? "destination" : "origin";
    const counterpartLocation = value[counterpart];
    if (counterpartLocation && !counterpartLocation.confirmed) {
      const map = mapRef.current;
      if (map) {
        map.flyTo({
          center: [counterpartLocation.longitude, counterpartLocation.latitude],
          zoom: map.getZoom(),
          duration: 800,
        });
      }
    }

    closeOverlay();
  };

  const selectCoordinates = async (
    kind: PointKind,
    latitude: number,
    longitude: number,
  ) => {
    const previousLocation = value[kind];
    const inputAddress =
      searchValues[kind].trim() ||
      previousLocation?.inputAddress ||
      MAP_SELECTION_FALLBACK_ADDRESS[kind];

    selectLocation(kind, {
      address: inputAddress,
      inputAddress,
      resolvedAddress: null,
      latitude,
      longitude,
      routableLatitude: latitude,
      routableLongitude: longitude,
      instructions: previousLocation?.instructions,
      confirmed: false,
    });

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&country=CO&language=es&access_token=${encodeURIComponent(MAPBOX_PUBLIC_TOKEN ?? "")}`,
      );
      if (!response.ok) return;

      const result = (await response.json()) as ReverseGeocodingResponse;
      const feature = result.features?.[0];
      const resolvedAddress =
        feature?.properties?.full_address ??
        feature?.full_address ??
        feature?.place_formatted ??
        feature?.name ??
        null;

      if (resolvedAddress) {
        selectLocation(kind, {
          address: resolvedAddress,
          inputAddress,
          resolvedAddress,
          latitude,
          longitude,
          routableLatitude: latitude,
          routableLongitude: longitude,
          instructions: previousLocation?.instructions,
          confirmed: false,
        });
      }
    } catch {
      setMessage(
        `Punto de ${getPointLabel(kind)} seleccionado. No fue posible obtener la dirección; revisa el pin y confírmalo.`,
      );
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

      const { latitude, longitude } = feature.properties.coordinates;
      const routablePoint = feature.properties.coordinates.routable_points?.[0];
      const usesDifferentRoutablePoint =
        routablePoint !== undefined &&
        (routablePoint.latitude !== latitude ||
          routablePoint.longitude !== longitude);
      const isPointOfInterest = feature.properties.feature_type === "poi";
      const resolvedAddress = getSelectedSearchBoxLabel(feature);
      const inputAddress = isPointOfInterest
        ? resolvedAddress
        : searchValues[kind].trim() || resolvedAddress;

      selectLocation(kind, {
        address: resolvedAddress,
        inputAddress,
        resolvedAddress,
        latitude,
        longitude,
        routableLatitude: routablePoint?.latitude ?? latitude,
        routableLongitude: routablePoint?.longitude ?? longitude,
        instructions: value[kind]?.instructions,
        confirmed: false,
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
          instructions: value.origin?.instructions,
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

  const stage = getStage(value);

  const renderSearchField = (kind: PointKind) => {
    const isOrigin = kind === "origin";
    const location = value[kind];

    return (
      <div className="route-picker-mapbox-search-field route-picker-mapbox-point-field">
        <div className="route-picker-mapbox-point-header">
          <span className="caption font-semibold text-ink">
            {isOrigin ? "Punto de recogida" : "Punto de entrega"}
          </span>
          {isOrigin ? (
            <div className="route-picker-mapbox-point-actions">
              <Button
                type="button"
                variant="secondary"
                className="route-picker-mapbox-location-button"
                onClick={useCurrentLocation}
                disabled={locating}
                aria-label="Usar mi ubicación como origen"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.25" />
                </svg>
                <span>{locating ? "Ubicando..." : "Usar mi ubicación"}</span>
              </Button>
            </div>
          ) : (
            location && (
              <button
                type="button"
                className="route-picker-mapbox-change-button"
                onClick={() => clearLocation("destination")}
              >
                Cambiar
              </button>
            )
          )}
        </div>
        {MAPBOX_PUBLIC_TOKEN && (
          <SearchBox
            accessToken={MAPBOX_PUBLIC_TOKEN}
            options={SEARCH_BOX_OPTIONS}
            value={searchValues[kind]}
            onChange={handleSearchChange(kind)}
            onClear={handleSearchClear(kind)}
            interceptSearch={normalizeColombianAddressQuery}
            placeholder={
              isOrigin
                ? "Busca el punto de recogida"
                : "Busca el punto de entrega"
            }
            marker={false}
            onRetrieve={handleRetrieve(kind)}
            onSuggestError={handleSuggestError}
          />
        )}
      </div>
    );
  };

  const renderPointArea = (kind: PointKind) => {
    const location = value[kind];
    if (!location?.confirmed) return renderSearchField(kind);

    return (
      <div className="route-picker-mapbox-confirmed-point">
        <span className="caption font-semibold text-ink">
          {kind === "origin" ? "Recogida confirmada" : "Entrega confirmada"}
        </span>
        <span
          className="route-picker-mapbox-collapsed-addresses"
          title={location.address}
        >
          {location.address}
        </span>
        <button
          type="button"
          className="route-picker-mapbox-change-button"
          onClick={() => openOverlay(kind)}
        >
          Cambiar
        </button>
      </div>
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
      <legend
        ref={legendRef}
        tabIndex={-1}
        className="flex w-full flex-col items-center justify-center gap-xxs pb-md text-center font-body text-body-md-medium text-ink"
      >
        <span className="flex items-center gap-sm">
          <span>¿A dónde necesitas enviar algo?</span>
          <HelpButton
            isOpen={isHelpOpen}
            onToggle={() => setIsHelpOpen((previous) => !previous)}
          />
          {(value.origin || value.destination) && (
            <button
              type="button"
              className="route-picker-mapbox-reset-button"
              onClick={resetRoute}
            >
              Reiniciar puntos
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
        <div className="route-picker-mapbox">
          <div className="route-picker-mapbox-search">
            {isSearchExpanded ? (
              <>
                {renderPointArea("origin")}
                {renderPointArea("destination")}
              </>
            ) : (
              <div className="route-picker-mapbox-collapsed-panel">
                <div className="route-picker-mapbox-collapsed-summary route-picker-mapbox-collapsed-points-summary">
                  <span className="route-picker-mapbox-collapsed-title">
                    {value.origin?.confirmed && value.destination?.confirmed
                      ? "Puntos confirmados"
                      : "Confirma los puntos"}
                  </span>
                  <div className="route-picker-mapbox-collapsed-point-row">
                    <span className="route-picker-mapbox-collapsed-point-label">
                      Recogida
                    </span>
                    <span
                      className="route-picker-mapbox-collapsed-point-address"
                      title={value.origin?.address ?? "Origen"}
                    >
                      {value.origin?.address ?? "Origen"}
                    </span>
                  </div>
                  <div className="route-picker-mapbox-collapsed-point-row">
                    <span className="route-picker-mapbox-collapsed-point-label">
                      Entrega
                    </span>
                    <span
                      className="route-picker-mapbox-collapsed-point-address"
                      title={value.destination?.address ?? "Destino"}
                    >
                      {value.destination?.address ?? "Destino"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="route-picker-mapbox-edit-button"
                  onClick={() => setIsSearchExpanded(true)}
                  aria-label="Editar origen y destino"
                >
                  Editar puntos
                </button>
              </div>
            )}
          </div>
          <Map
            ref={mapRef}
            initialViewState={INITIAL_VIEW}
            mapboxAccessToken={MAPBOX_PUBLIC_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            dragPan
            scrollZoom
            doubleClickZoom
            touchZoomRotate
            onLoad={fitSelectedRoute}
            onClick={() => {
              if (activeOverlayKind) closeOverlay();
            }}
          >
            <NavigationControl position="top-right" showCompass={false} />
            {value.origin && (
              <Marker
                longitude={value.origin.longitude}
                latitude={value.origin.latitude}
                anchor="bottom"
                draggable
                onDragStart={() => {
                  isMarkerDraggingRef.current = true;
                }}
                onDragEnd={(event) => {
                  suppressMarkerClickAfterDrag();
                  selectCoordinates(
                    "origin",
                    event.lngLat.lat,
                    event.lngLat.lng,
                  );
                }}
                onClick={(event) => {
                  event.originalEvent?.stopPropagation();
                  if (
                    isMarkerDraggingRef.current ||
                    suppressMarkerClickRef.current
                  ) {
                    return;
                  }
                  openOverlay("origin");
                }}
              >
                <div className="route-picker-mapbox-pin-wrapper">
                  <RouteMarkerPin
                    color="#16803a"
                    confirmed={value.origin.confirmed}
                  />
                  {isAffordanceVisible("origin", value, activeOverlayKind) && (
                    <span
                      className={
                        getDiscrepancySeverity(value.origin) ===
                        "house_number_mismatch"
                          ? "route-picker-mapbox-pin-affordance route-picker-mapbox-pin-affordance--warning"
                          : "route-picker-mapbox-pin-affordance"
                      }
                    >
                      {getDiscrepancySeverity(value.origin) ===
                      "house_number_mismatch"
                        ? "⚠ Revisa este punto"
                        : "Toca para confirmar"}
                    </span>
                  )}
                  {isEditHintVisible("origin", value, activeOverlayKind) && (
                    <span className="route-picker-mapbox-pin-edit-hint">
                      Toca para cambiar
                    </span>
                  )}
                </div>
              </Marker>
            )}
            {value.destination && (
              <Marker
                longitude={value.destination.longitude}
                latitude={value.destination.latitude}
                anchor="bottom"
                draggable
                onDragStart={() => {
                  isMarkerDraggingRef.current = true;
                }}
                onDragEnd={(event) => {
                  suppressMarkerClickAfterDrag();
                  selectCoordinates(
                    "destination",
                    event.lngLat.lat,
                    event.lngLat.lng,
                  );
                }}
                onClick={(event) => {
                  event.originalEvent?.stopPropagation();
                  if (
                    isMarkerDraggingRef.current ||
                    suppressMarkerClickRef.current
                  ) {
                    return;
                  }
                  openOverlay("destination");
                }}
              >
                <div className="route-picker-mapbox-pin-wrapper">
                  <RouteMarkerPin
                    color="#fa520f"
                    confirmed={value.destination.confirmed}
                  />
                  {isAffordanceVisible(
                    "destination",
                    value,
                    activeOverlayKind,
                  ) && (
                    <span
                      className={
                        getDiscrepancySeverity(value.destination) ===
                        "house_number_mismatch"
                          ? "route-picker-mapbox-pin-affordance route-picker-mapbox-pin-affordance--warning"
                          : "route-picker-mapbox-pin-affordance"
                      }
                    >
                      {getDiscrepancySeverity(value.destination) ===
                      "house_number_mismatch"
                        ? "⚠ Revisa este punto"
                        : "Toca para confirmar"}
                    </span>
                  )}
                  {isEditHintVisible(
                    "destination",
                    value,
                    activeOverlayKind,
                  ) && (
                    <span className="route-picker-mapbox-pin-edit-hint">
                      Toca para cambiar
                    </span>
                  )}
                </div>
              </Marker>
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
          {activeOverlayKind && value[activeOverlayKind] && (
            <RoutePointOverlay
              kind={activeOverlayKind}
              mode={getOverlayMode(activeOverlayKind, value)}
              location={value[activeOverlayKind]}
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
