import type { QuoteErrandRequest } from "../types/api";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export interface Errand {
  id: string;
  type: string;
  description: string;
  origin_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lng: number | null;
  fare: number;
  platform_commission: number;
  rider_earnings: number;
  rider_id: string | null;
  rider_name: string | null;
  motorcycle_plate: string | null;
  status: string;
  payment_method: string;
  pin: string | null;
  requested_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

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

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getAvailableErrands(token);
      setErrands(data.data || data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading errands");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { errands, loading, error, refresh: load };
};

export const useMyErrands = () => {
  const { token } = useAuth();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (!token) return;
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const data: any = await api.getMyErrands(token);
        setErrands(data.data || data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading errands");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load();

    const refreshInBackground = () => {
      void load(false);
    };
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
    };
  }, [load]);

  return { errands, loading, error, refresh: load };
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
