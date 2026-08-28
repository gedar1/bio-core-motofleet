import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export interface PricingRule {
  id: string;
  errand_type: string;
  base_rate: number;
  rate_per_km: number;
  commission_percentage: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePricingRules = () => {
  const { token } = useAuth();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getPricingRules(token);
      setRules(data.data || data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading pricing rules",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { rules, loading, error, refresh: load };
};
