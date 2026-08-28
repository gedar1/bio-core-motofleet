import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export interface Motorcycle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  engine_cc: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useMotorcycles = () => {
  const { token } = useAuth();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getMotorcycles(token);
      setMotorcycles(data.data || data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading motorcycles",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { motorcycles, loading, error, refresh: load };
};
