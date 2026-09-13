import { useCallback, useEffect, useRef } from "react";

const MARKER_CLICK_SUPPRESSION_DURATION_MS = 250;

/** Prevents the click emitted immediately after a marker drag from opening its overlay. */
export const useMarkerClickSuppression = () => {
  const isMarkerDraggingRef = useRef(false);
  const suppressMarkerClickRef = useRef(false);
  const markerClickSuppressionTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      if (markerClickSuppressionTimeoutRef.current) {
        clearTimeout(markerClickSuppressionTimeoutRef.current);
      }
    },
    [],
  );

  const onMarkerDragStart = useCallback((): void => {
    isMarkerDraggingRef.current = true;
  }, []);

  const suppressMarkerClickAfterDrag = useCallback((): void => {
    isMarkerDraggingRef.current = false;
    suppressMarkerClickRef.current = true;
    if (markerClickSuppressionTimeoutRef.current) {
      clearTimeout(markerClickSuppressionTimeoutRef.current);
    }
    markerClickSuppressionTimeoutRef.current = setTimeout(() => {
      suppressMarkerClickRef.current = false;
    }, MARKER_CLICK_SUPPRESSION_DURATION_MS);
  }, []);

  const shouldSuppressMarkerClick = useCallback(
    (): boolean =>
      isMarkerDraggingRef.current || suppressMarkerClickRef.current,
    [],
  );

  return {
    onMarkerDragStart,
    shouldSuppressMarkerClick,
    suppressMarkerClickAfterDrag,
  };
};
