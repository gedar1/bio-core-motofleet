import { useEffect, useRef } from "react";
import { SearchBox } from "@mapbox/search-js-react";
import { Button } from "../../Button";
import {
  getAddressResolution,
  getPointLabel,
  hasSeparateRoutablePoint,
  isAddressResolutionPending,
  normalizeColombianAddressQuery,
  resolveDisplayAddress,
} from "../RoutePickerMapbox.helpers";
import type { OverlayMode } from "../RoutePickerMapbox.helpers";
import type {
  PointKind,
  RouteAddressResolution,
  RouteLocation,
  SearchBoxRetrieveResponse,
} from "../RoutePickerMapbox.types";

const SEARCH_BOX_OPTIONS = {
  country: "CO",
  language: "es",
  // Search Box includes POIs as well as addresses and streets when `types`
  // is omitted, preserving Calle/Carrera lookup while enabling place names.
  limit: 5,
  proximity: { lng: -75.5812, lat: 6.2442 },
} as const;

const ResolutionNotice = ({
  location,
  resolution,
}: {
  readonly kind: PointKind;
  readonly location: RouteLocation;
  readonly resolution: RouteAddressResolution;
}) => {
  if (resolution === "pending") {
    return (
      <p className="route-picker-mapbox-discrepancy-minor">
        Verificando la ubicación exacta del pin…
      </p>
    );
  }

  if (resolution === "significant") {
    return (
      <div className="route-picker-mapbox-discrepancy-high">
        <p className="m-0">
          ⚠ La dirección indicada por el usuario no coincide con la ubicación
          del pin.
        </p>
        <p className="m-0 mt-xxs">
          <strong>Dirección indicada por el usuario:</strong>{" "}
          {location.inputAddress}
        </p>
        <p className="m-0 mt-xxs">
          <strong>Ubicación confirmada en el mapa:</strong>{" "}
          {location.resolvedAddress}
        </p>
        <p className="m-0">
          ⚠ La dirección digitada por el usuario sera la que vera el rider. Esta
          ubicacion se usa como guia para llegar al punto.
        </p>
      </div>
    );
  }

  if (resolution === "minor" || resolution === "poi") {
    return (
      <p className="route-picker-mapbox-discrepancy-minor">
        {resolution === "poi"
          ? "Conservaremos el lugar indicado por el usuario"
          : "Conservaremos la dirección indicada por el usuario"}
        , pero el rider debe seguir el pin exacto
        {location.resolvedAddress ? `: ${location.resolvedAddress}.` : "."}
      </p>
    );
  }

  if (resolution === "pin_only" || resolution === "unresolved") {
    return (
      <p className="route-picker-mapbox-discrepancy-minor">
        {resolution === "unresolved"
          ? "No fue posible validar una dirección para el pin."
          : "Este punto fue seleccionado directamente en el mapa."}{" "}
        El rider debe seguir el pin exacto.
      </p>
    );
  }

  return null;
};

interface RoutePointOverlayProps {
  readonly kind: PointKind;
  readonly mode: OverlayMode;
  readonly location: RouteLocation;
  readonly accessToken: string;
  readonly searchValue: string;
  readonly onSearchChange: (nextValue: string) => void;
  readonly onSearchClear: () => void;
  readonly onRetrieve: (response: SearchBoxRetrieveResponse) => void;
  readonly onSuggestError: () => void;
  readonly onInstructionsChange: (instructions: string) => void;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

/** Non-modal panel that keeps the visible map interactive outside its bounds. */
export const RoutePointOverlay = ({
  kind,
  mode,
  location,
  accessToken,
  searchValue,
  onSearchChange,
  onSearchClear,
  onRetrieve,
  onSuggestError,
  onInstructionsChange,
  onConfirm,
  onClose,
}: RoutePointOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingId = `route-picker-overlay-heading-${kind}`;
  const addressResolution = getAddressResolution(kind, location);
  const isResolutionPending = isAddressResolutionPending(kind, location);

  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLElement>("textarea, input, button")
      ?.focus();
  }, [kind, mode]);

  return (
    <div
      ref={containerRef}
      className={`route-picker-mapbox-overlay${
        mode === "edit" ? " route-picker-mapbox-overlay--edit" : ""
      }`}
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
        overflowY: mode === "edit" ? "visible" : "auto",
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
          accessToken={accessToken}
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
          <ResolutionNotice
            kind={kind}
            location={location}
            resolution={addressResolution}
          />
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
            disabled={isResolutionPending}
          >
            {isResolutionPending
              ? "Verificando ubicación del pin..."
              : addressResolution === "significant"
                ? "Confirmar ubicación del pin"
                : `Confirmar punto de ${getPointLabel(kind)}`}
          </Button>
        </>
      )}
    </div>
  );
};
