import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

interface StatusCount {
  status: string;
  count: number;
}

export interface MetricsData {
  errands_by_status: StatusCount[];
  commission_total: number;
  motorcycles_by_status: StatusCount[];
  contracts_by_status: StatusCount[];
  rental_payments_total: number;
}

export const useMetrics = () => {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getMetrics(token);
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading metrics");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { metrics, loading, error, refresh: load };
};
