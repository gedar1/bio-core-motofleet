import { useEffect, useRef } from "react";
import { SearchBox } from "@mapbox/search-js-react";
import { Button } from "../../Button";
import {
  getDiscrepancySeverity,
  getPointLabel,
  hasAddressDiscrepancy,
  hasSeparateRoutablePoint,
  normalizeColombianAddressQuery,
  resolveDisplayAddress,
} from "../RoutePickerMapbox.helpers";
import type {
  OverlayMode,
} from "../RoutePickerMapbox.helpers";
import type {
  PointKind,
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

const DiscrepancyNotice = ({ location }: { readonly location: RouteLocation }) => {
  if (!hasAddressDiscrepancy(location)) return null;

  const isHouseNumberMismatch =
    getDiscrepancySeverity(location) === "house_number_mismatch";

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
          Mapbox ubicó tu búsqueda en: <strong>{location.resolvedAddress}</strong>.
        </>
      )}
    </p>
  );
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
