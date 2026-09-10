import { SearchBox } from "@mapbox/search-js-react";
import { Button } from "../../Button";
import {
  normalizeColombianAddressQuery,
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

interface RoutePointSearchProps {
  readonly kind: PointKind;
  readonly location: RouteLocation | null;
  readonly accessToken: string;
  readonly searchValue: string;
  readonly locating: boolean;
  readonly onSearchChange: (nextValue: string) => void;
  readonly onSearchClear: () => void;
  readonly onRetrieve: (response: SearchBoxRetrieveResponse) => void;
  readonly onSuggestError: () => void;
  readonly onUseCurrentLocation: () => void;
  readonly onClearLocation: () => void;
  readonly onOpenOverlay: () => void;
}

export const RoutePointSearch = ({
  kind,
  location,
  accessToken,
  searchValue,
  locating,
  onSearchChange,
  onSearchClear,
  onRetrieve,
  onSuggestError,
  onUseCurrentLocation,
  onClearLocation,
  onOpenOverlay,
}: RoutePointSearchProps) => {
  const isOrigin = kind === "origin";

  if (location?.confirmed) {
    return (
      <div className="route-picker-mapbox-confirmed-point">
        <span className="caption font-semibold text-ink">
          {isOrigin ? "Recogida confirmada" : "Entrega confirmada"}
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
          onClick={onOpenOverlay}
        >
          Cambiar
        </button>
      </div>
    );
  }

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
              onClick={onUseCurrentLocation}
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
              onClick={onClearLocation}
            >
              Cambiar
            </button>
          )
        )}
      </div>
      <SearchBox
        accessToken={accessToken}
        options={SEARCH_BOX_OPTIONS}
        value={searchValue}
        onChange={onSearchChange}
        onClear={onSearchClear}
        interceptSearch={normalizeColombianAddressQuery}
        placeholder={
          isOrigin ? "Busca el punto de recogida" : "Busca el punto de entrega"
        }
        marker={false}
        onRetrieve={onRetrieve}
        onSuggestError={onSuggestError}
      />
    </div>
  );
};
