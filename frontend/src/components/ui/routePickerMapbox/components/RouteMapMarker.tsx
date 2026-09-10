import { Marker } from "react-map-gl/mapbox";
import {
  getDiscrepancySeverity,
  isAffordanceVisible,
  isEditHintVisible,
} from "../RoutePickerMapbox.helpers";
import type {
  PointKind,
  RouteLocation,
  RouteValue,
} from "../RoutePickerMapbox.types";

interface RouteMapMarkerProps {
  readonly kind: PointKind;
  readonly location: RouteLocation;
  readonly value: RouteValue;
  readonly color: string;
  readonly activeOverlayKind: PointKind | null;
  readonly onDragStart: () => void;
  readonly onDragEnd: (latitude: number, longitude: number) => void;
  readonly onClick: () => void;
}

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

export const RouteMapMarker = ({
  kind,
  location,
  value,
  color,
  activeOverlayKind,
  onDragStart,
  onDragEnd,
  onClick,
}: RouteMapMarkerProps) => {
  const isWarning =
    getDiscrepancySeverity(location) === "house_number_mismatch";

  return (
    <Marker
      longitude={location.longitude}
      latitude={location.latitude}
      anchor="bottom"
      draggable
      onDragStart={onDragStart}
      onDragEnd={(event) => onDragEnd(event.lngLat.lat, event.lngLat.lng)}
      onClick={(event) => {
        event.originalEvent?.stopPropagation();
        onClick();
      }}
    >
      <div className="route-picker-mapbox-pin-wrapper">
        <RouteMarkerPin color={color} confirmed={location.confirmed} />
        {isAffordanceVisible(kind, value, activeOverlayKind) && (
          <span
            className={
              isWarning
                ? "route-picker-mapbox-pin-affordance route-picker-mapbox-pin-affordance--warning"
                : "route-picker-mapbox-pin-affordance"
            }
          >
            {isWarning ? "⚠ Revisa este punto" : "Toca para confirmar"}
          </span>
        )}
        {isEditHintVisible(kind, value, activeOverlayKind) && (
          <span className="route-picker-mapbox-pin-edit-hint">
            Toca para cambiar
          </span>
        )}
      </div>
    </Marker>
  );
};
