import type { RouteValue } from "../RoutePickerMapbox.types";

interface CollapsedPointsSummaryProps {
  readonly value: RouteValue;
  readonly onEdit: () => void;
}

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
      Editar puntos
    </button>
  </div>
);
