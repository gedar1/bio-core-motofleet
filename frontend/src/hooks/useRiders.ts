import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  document_type: "CC" | "CE" | "PPT" | "PASAPORTE" | null;
  license_number: string;
  license_expiry: string;
  status: string;
  available: boolean | number;
}

export const useRiders = () => {
  const { token } = useAuth();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getRiders(token);
      setRiders(data.data || data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading riders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { riders, loading, error, refresh: load };
};
