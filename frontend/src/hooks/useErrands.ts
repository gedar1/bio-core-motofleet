import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export interface Errand {
  id: string;
  type: string;
  description: string;
  origin_address: string;
  destination_address: string;
  fare: number;
  platform_commission: number;
  rider_earnings: number;
  status: string;
  payment_method: string;
  requested_at: string;
}

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

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getMyErrands(token);
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

export const useAdminErrands = () => {
  const { token } = useAuth();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.getAdminErrands(token);
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

  return { accept, pickup, deliver, cancel, create };
};
