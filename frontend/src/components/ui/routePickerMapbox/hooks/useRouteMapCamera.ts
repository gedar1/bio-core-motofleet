import { useCallback, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import type { PointKind, RouteValue } from "../RoutePickerMapbox.types";

const ROUTE_FIT_PADDING = { top: 180, right: 56, bottom: 128, left: 56 };
const ROUTE_FIT_MAX_ZOOM = 15;
const ROUTE_FIT_DURATION_MS = 600;
const PENDING_COUNTERPART_FOCUS_DURATION_MS = 800;

interface UseRouteMapCameraParams {
  readonly mapRef: RefObject<MapRef | null>;
  readonly value: RouteValue;
}

/** Coordinates initial framing, pending-point focus, and final route framing. */
export const useRouteMapCamera = ({
  mapRef,
  value,
}: UseRouteMapCameraParams) => {
  const hasFittedConfirmedRouteRef = useRef(false);

  const fitRoute = useCallback(
    (route: RouteValue): void => {
      const { origin, destination } = route;
      if (!origin || !destination) return;

      mapRef.current?.fitBounds(
        [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
        {
          padding: ROUTE_FIT_PADDING,
          maxZoom: ROUTE_FIT_MAX_ZOOM,
          duration: ROUTE_FIT_DURATION_MS,
        },
      );
    },
    [mapRef],
  );

  const onMapLoad = useCallback((): void => {
    fitRoute(value);
  }, [fitRoute, value]);

  const fitConfirmedRoute = useCallback(
    (nextValue: RouteValue, confirmedKind: PointKind): boolean => {
      const counterpartKind: PointKind =
        confirmedKind === "origin" ? "destination" : "origin";
      const locationBeforeConfirmation = value[confirmedKind];
      const counterpartBeforeConfirmation = value[counterpartKind];

      if (
        hasFittedConfirmedRouteRef.current ||
        !locationBeforeConfirmation ||
        locationBeforeConfirmation.confirmed ||
        !counterpartBeforeConfirmation?.confirmed ||
        !nextValue.origin?.confirmed ||
        !nextValue.destination?.confirmed ||
        !mapRef.current
      ) {
        return false;
      }

      hasFittedConfirmedRouteRef.current = true;
      fitRoute(nextValue);
      return true;
    },
    [fitRoute, mapRef, value],
  );

  const resetConfirmedRouteFit = useCallback((): void => {
    hasFittedConfirmedRouteRef.current = false;
  }, []);

  const focusPendingCounterpart = useCallback(
    (confirmedKind: PointKind): void => {
      const counterpart: PointKind =
        confirmedKind === "origin" ? "destination" : "origin";
      const counterpartLocation = value[counterpart];
      const map = mapRef.current;

      if (!counterpartLocation || counterpartLocation.confirmed || !map) return;

      map.flyTo({
        center: [counterpartLocation.longitude, counterpartLocation.latitude],
        zoom: map.getZoom(),
        duration: PENDING_COUNTERPART_FOCUS_DURATION_MS,
      });
    },
    [mapRef, value],
  );

  return {
    fitConfirmedRoute,
    focusPendingCounterpart,
    onMapLoad,
    resetConfirmedRouteFit,
  };
};
