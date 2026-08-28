import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

interface StatusCount {
  status: string;
  count: number;
}

export interface MetricsData {
  period: {
    start_date: string;
    end_date: string;
  };
  errands_by_status: StatusCount[];
  commission_total: number;
  motorcycles_by_status: StatusCount[];
  contracts_by_status: StatusCount[];
  rental_payments_total: number;
}

export type PeriodType = "daily" | "weekly" | "monthly";

const getDateRange = (period: PeriodType): [string, string] => {
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

export const useMetrics = (period: PeriodType = "monthly") => {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (activePeriod: PeriodType = period) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [startDate, endDate] = getDateRange(activePeriod);
        const data: any = await api.getMetrics(token, startDate, endDate);
        setMetrics(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading metrics");
      } finally {
        setLoading(false);
      }
    },
    [token, period],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { metrics, loading, error, refresh: load, getDateRange };
};
