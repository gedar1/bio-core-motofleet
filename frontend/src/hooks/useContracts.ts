import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export interface Contract {
  id: string;
  rider_id: string;
  rider_name: string | null;
  motorcycle_id: string;
  motorcycle_plate: string | null;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  payment_day: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useContracts = () => {
  const { token } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getContracts(token);
      setContracts(data.data || data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading contracts");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { contracts, loading, error, refresh: load };
};
