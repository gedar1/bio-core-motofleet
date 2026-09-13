interface RoutePickerHelpButtonProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

/** Small "?" trigger that reveals usage tips in a popover instead of a fixed banner. */
export const RoutePickerHelpButton = ({
  isOpen,
  onToggle,
}: RoutePickerHelpButtonProps) => (
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
