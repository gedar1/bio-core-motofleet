import { Icon } from "@/components/shared/components/Icon";
import type {
  PointKind,
  RouteLocation,
  RouteValue,
} from "../RoutePickerMapbox.types";

interface CollapsedPointsSummaryProps {
  readonly value: RouteValue;
  readonly onEdit: () => void;
}

interface CollapsedPointSummaryProps {
  readonly kind: PointKind;
  readonly location: RouteLocation;
  readonly onEdit: () => void;
}

const getPointLabel = (kind: PointKind): string =>
  kind === "origin" ? "Recogida" : "Entrega";

/** Compact mobile summary for a selected point while the other step is active. */
export const CollapsedPointSummary = ({
  kind,
  location,
  onEdit,
}: CollapsedPointSummaryProps) => {
  const pointLabel = getPointLabel(kind);
  const status = location.confirmed ? "confirmada" : "por confirmar";

  return (
    <div className="route-picker-mapbox-collapsed-panel route-picker-mapbox-collapsed-panel--single">
      <div className="route-picker-mapbox-collapsed-summary">
        <span className="route-picker-mapbox-collapsed-title">
          {pointLabel} {status}
        </span>
        <span
          className="route-picker-mapbox-collapsed-addresses"
          title={location.address}
        >
          {location.address}
        </span>
      </div>
      <button
        type="button"
        className="route-picker-mapbox-edit-button"
        onClick={onEdit}
        aria-label={`Editar punto de ${pointLabel.toLowerCase()}`}
      >
        <Icon name="squarePen" size={18} />
      </button>
    </div>
  );
};

export const CollapsedPointsSummary = ({
  value,
  onEdit,
}: CollapsedPointsSummaryProps) => (
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
      onClick={onEdit}
      aria-label="Editar origen y destino"
    >
      <Icon name="squarePen" size={18} />
    </button>
  </div>
);
