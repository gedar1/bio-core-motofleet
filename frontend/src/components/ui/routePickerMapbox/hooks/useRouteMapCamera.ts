import { useCallback, useRef, type RefObject } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import type {
  PointKind,
  RouteLocation,
  RouteValue,
} from "../RoutePickerMapbox.types";

const DESKTOP_ROUTE_FIT_PADDING = {
  top: 180,
  right: 56,
  bottom: 128,
  left: 56,
};
const MOBILE_ROUTE_FIT_PADDING = {
  top: 184,
  right: 32,
  bottom: 112,
  left: 32,
};
const ROUTE_FIT_MAX_ZOOM = 15;
const SINGLE_POINT_MAX_ZOOM = 16;
const ROUTE_FIT_DURATION_MS = 600;
const PENDING_COUNTERPART_FOCUS_DURATION_MS = 800;

interface UseRouteMapCameraParams {
  readonly mapRef: RefObject<MapRef | null>;
  readonly value: RouteValue;
  readonly isMobileLayout: boolean;
}

/** Coordinates initial framing, pending-point focus, and final route framing. */
export const useRouteMapCamera = ({
  mapRef,
  value,
  isMobileLayout,
}: UseRouteMapCameraParams) => {
  const hasFittedConfirmedRouteRef = useRef(false);
  const routeFitPadding = isMobileLayout
    ? MOBILE_ROUTE_FIT_PADDING
    : DESKTOP_ROUTE_FIT_PADDING;

  const focusLocation = useCallback(
    (location: Pick<RouteLocation, "latitude" | "longitude">, duration = 0) => {
      mapRef.current?.fitBounds(
        [
          [location.longitude, location.latitude],
          [location.longitude, location.latitude],
        ],
        {
          padding: routeFitPadding,
          maxZoom: SINGLE_POINT_MAX_ZOOM,
          duration,
        },
      );
    },
    [mapRef, routeFitPadding],
  );

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
          padding: routeFitPadding,
          maxZoom: ROUTE_FIT_MAX_ZOOM,
          duration: ROUTE_FIT_DURATION_MS,
        },
      );
    },
    [mapRef, routeFitPadding],
  );

  const onMapLoad = useCallback((): void => {
    if (value.origin && value.destination) {
      fitRoute(value);
      return;
    }

    if (value.origin) focusLocation(value.origin);
  }, [fitRoute, focusLocation, value]);

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

      if (!counterpartLocation || counterpartLocation.confirmed) return;
      focusLocation(counterpartLocation, PENDING_COUNTERPART_FOCUS_DURATION_MS);
    },
    [focusLocation, value],
  );

  return {
    fitConfirmedRoute,
    focusLocation,
    focusPendingCounterpart,
    onMapLoad,
    resetConfirmedRouteFit,
  };
};
