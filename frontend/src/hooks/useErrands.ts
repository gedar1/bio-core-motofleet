import type { QuoteErrandRequest } from "../types/api";
import type { Errand } from "../types/errand";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { getPendingRiderErrands } from "../pages/rider/utils/riderErrandState";

export type { Errand } from "../types/errand";

export type PeriodFilterType = "all" | "daily" | "weekly" | "monthly";

const getDateRange = (
  period: PeriodFilterType,
): [string | null, string | null] => {
  if (period === "all") return [null, null];

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      startDate = new Date(now);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day;
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const start = startDate.toISOString().substring(0, 10);
  const end = now.toISOString().substring(0, 10);

  return [start, end];
};

export const useAvailableErrands = () => {
  const { token } = useAuth();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const loadingRef = useRef(false);
  const acceptedErrandIdsRef = useRef(new Set<string>());

  const load = useCallback(
    async (showLoading = false) => {
      if (!token || loadingRef.current) return;
      loadingRef.current = true;
      const requestVersion = ++requestVersionRef.current;
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const data: unknown = await api.getAvailableErrands(token);
        if (requestVersion !== requestVersionRef.current) return;
        const response = data as { data?: Errand[] } | Errand[];
        const incoming = Array.isArray(response)
          ? response
          : (response.data ?? []);
        const pending = getPendingRiderErrands(incoming).filter(
          (errand) => !acceptedErrandIdsRef.current.has(errand.id),
        );
        setErrands(pending);
      } catch (err: unknown) {
        if (requestVersion === requestVersionRef.current) {
          setError(
            err instanceof Error ? err.message : "Error loading errands",
          );
        }
      } finally {
        loadingRef.current = false;
        if (requestVersion === requestVersionRef.current) setLoading(false);
      }
    },
    [token],
  );

  const confirmAccepted = useCallback((errand: Errand) => {
    acceptedErrandIdsRef.current.add(errand.id);
    setErrands((current) => current.filter((item) => item.id !== errand.id));
  }, []);

  useEffect(() => {
    acceptedErrandIdsRef.current.clear();
    requestVersionRef.current += 1;
    void load(true);

    const refreshInBackground = () => void load(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshInBackground();
    };
    const handleErrandCreated = () => refreshInBackground();
    const interval = window.setInterval(refreshInBackground, 15_000);

    window.addEventListener("focus", refreshInBackground);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("motofleet:errand-created", handleErrandCreated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshInBackground);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "motofleet:errand-created",
        handleErrandCreated,
      );
    };
  }, [load]);

  return {
    errands,
    loading,
    error,
    refresh: load,
    confirmAccepted,
  };
};

export const useMyErrands = () => {
  const { token } = useAuth();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (showLoading = true) => {
      if (!token || loadingRef.current) return;
      loadingRef.current = true;
      const requestVersion = ++requestVersionRef.current;
      if (showLoading) {
        setLoading(true);
        setRefreshing(false);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const data: unknown = await api.getMyErrands(token);
        if (requestVersion !== requestVersionRef.current) return;
        const response = data as { data?: Errand[] } | Errand[];
        setErrands(Array.isArray(response) ? response : (response.data ?? []));
      } catch (err: unknown) {
        if (requestVersion === requestVersionRef.current) {
          setError(
            err instanceof Error ? err.message : "Error loading errands",
          );
        }
      } finally {
        if (requestVersion === requestVersionRef.current) {
          loadingRef.current = false;
          if (showLoading) {
            setLoading(false);
          } else {
            setRefreshing(false);
          }
        }
      }
    },
    [token],
  );

  useEffect(() => {
    void load(true);

    const refreshInBackground = () => void load(false);
    const interval = window.setInterval(refreshInBackground, 15_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshInBackground();
    };

    window.addEventListener("focus", refreshInBackground);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshInBackground);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Invalidate the effect cycle so StrictMode cleanup cannot own the next request.
      requestVersionRef.current += 1;
      loadingRef.current = false;
    };
  }, [load]);

  return { errands, loading, refreshing, error, refresh: load };
};

export const useAdminErrands = (period: PeriodFilterType = "all") => {
  const { token } = useAuth();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (activePeriod: PeriodFilterType = period) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [startDate, endDate] = getDateRange(activePeriod);
        const data: any = await api.getAdminErrands(token, startDate, endDate);
        setErrands(data.data || data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading errands");
      } finally {
        setLoading(false);
      }
    },
    [token, period],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { errands, loading, error, refresh: load };
};

export const useErrandActions = () => {
  const { token } = useAuth();

  const accept = useCallback(
    async (errandId: string) => {
      if (!token) throw new Error("Not authenticated");
      return api.acceptErrand(token, errandId);
    },
    [token],
  );

  const pickup = useCallback(
    async (errandId: string) => {
      if (!token) throw new Error("Not authenticated");
      return api.pickupErrand(token, errandId);
    },
    [token],
  );

  const deliver = useCallback(
    async (errandId: string) => {
      if (!token) throw new Error("Not authenticated");
      return api.deliverErrand(token, errandId);
    },
    [token],
  );

  const cancel = useCallback(
    async (errandId: string, reason?: string) => {
      if (!token) throw new Error("Not authenticated");
      return api.cancelErrand(token, errandId, reason);
    },
    [token],
  );

  const create = useCallback(
    async (data: Record<string, unknown>) => {
      if (!token) throw new Error("Not authenticated");
      return api.createErrand(token, data);
    },
    [token],
  );

  const estimateRoute = useCallback(
    async (
      origin: { latitude: number; longitude: number },
      destination: { latitude: number; longitude: number },
    ) => {
      if (!token) throw new Error("Not authenticated");
      return api.estimateErrandRoute(token, { origin, destination });
    },
    [token],
  );

  const quote = useCallback(
    async (data: QuoteErrandRequest) => {
      if (!token) throw new Error("Not authenticated");
      return api.quoteErrand(token, data);
    },
    [token],
  );

  const getRoutePreview = useCallback(
    async (errandId: string) => {
      if (!token) throw new Error("Not authenticated");
      return api.getRiderErrandRoutePreview(token, errandId);
    },
    [token],
  );

  return {
    accept,
    pickup,
    deliver,
    cancel,
    create,
    estimateRoute,
    quote,
    getRoutePreview,
  };
};
