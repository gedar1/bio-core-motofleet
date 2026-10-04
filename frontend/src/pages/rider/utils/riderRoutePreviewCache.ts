import type { RouteEstimateResponse } from "../../../types/api";

type RouteLoader = () => Promise<RouteEstimateResponse>;

const routePreviewCache = new Map<string, RouteEstimateResponse>();
const pendingRoutePreviews = new Map<string, Promise<RouteEstimateResponse>>();

export const getCachedRoutePreview = (
  errandId: string,
): RouteEstimateResponse | null => routePreviewCache.get(errandId) ?? null;

export const getOrLoadRoutePreview = (
  errandId: string,
  load: RouteLoader,
): Promise<RouteEstimateResponse> => {
  const cached = routePreviewCache.get(errandId);
  if (cached) return Promise.resolve(cached);

  const pending = pendingRoutePreviews.get(errandId);
  if (pending) return pending;

  const request = load()
    .then((preview) => {
      routePreviewCache.set(errandId, preview);
      return preview;
    })
    .finally(() => {
      pendingRoutePreviews.delete(errandId);
    });

  pendingRoutePreviews.set(errandId, request);
  return request;
};
