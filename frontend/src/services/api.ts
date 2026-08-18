import type {
  ErrandQuoteResponse,
  QuoteErrandRequest,
  RouteEstimateRequest,
  RouteEstimateResponse,
} from "../types/api";

const BASE_URL = "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const api = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, token } = options;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new ApiError(data.status, data.code, data.message, data.details);
    }

    return data as T;
  },

  // --- Auth ---
  login(email: string, password: string) {
    return this.request<{ token: string; role: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  registerUser(data: Record<string, unknown>) {
    return this.request("/users/register", { method: "POST", body: data });
  },

  registerRider(data: Record<string, unknown>) {
    return this.request("/riders/register", { method: "POST", body: data });
  },

  // --- Errands ---
  createErrand(token: string, data: Record<string, unknown>) {
    return this.request("/errands", { method: "POST", body: data, token });
  },

  estimateErrandRoute(token: string, data: RouteEstimateRequest) {
    return this.request<RouteEstimateResponse>("/errands/route-estimate", {
      method: "POST",
      body: data,
      token,
    });
  },

  quoteErrand(token: string, data: QuoteErrandRequest) {
    return this.request<ErrandQuoteResponse>("/errands/quote", {
      method: "POST",
      body: data,
      token,
    });
  },

  getRiderErrandRoutePreview(token: string, errandId: string) {
    return this.request<RouteEstimateResponse>(
      `/errands/${errandId}/route-preview`,
      { token },
    );
  },

  getAvailableErrands(token: string) {
    return this.request("/errands/available", { token });
  },

  getMyErrands(token: string, params?: string) {
    const query = params ? `?${params}` : "";
    return this.request(`/errands/my${query}`, { token });
  },

  acceptErrand(token: string, errandId: string) {
    return this.request(`/errands/${errandId}/accept`, {
      method: "PATCH",
      token,
    });
  },

  pickupErrand(token: string, errandId: string) {
    return this.request(`/errands/${errandId}/pickup`, {
      method: "PATCH",
      token,
    });
  },

  deliverErrand(token: string, errandId: string) {
    return this.request(`/errands/${errandId}/deliver`, {
      method: "PATCH",
      token,
    });
  },

  cancelErrand(token: string, errandId: string, reason?: string) {
    return this.request(`/errands/${errandId}/cancel`, {
      method: "PATCH",
      token,
      body: reason ? { reason } : undefined,
    });
  },

  // --- Admin ---
  getMotorcycles(token: string) {
    return this.request("/motorcycles", { token });
  },

  createMotorcycle(token: string, data: Record<string, unknown>) {
    return this.request("/motorcycles", { method: "POST", body: data, token });
  },

  getContracts(token: string) {
    return this.request("/contracts", { token });
  },

  getPricingRules(token: string) {
    return this.request("/pricing-rules", { token });
  },

  getMetrics(token: string) {
    return this.request("/admin/metrics", { token });
  },

  getAdminErrands(token: string) {
    return this.request("/admin/errands", { token });
  },

  getRiders(token: string) {
    return this.request("/admin/riders", { token });
  },

  getRidersForSelect(token: string) {
    return this.request<
      Array<{ id: string; name: string; phone: string; status: string }>
    >("/admin/riders-select", { token });
  },

  getMotorcyclesForSelect(token: string) {
    return this.request<
      Array<{
        id: string;
        plate: string;
        brand: string;
        model: string;
        status: string;
      }>
    >("/admin/motorcycles-select", { token });
  },

  // --- Rider availability ---
  toggleRiderAvailability(token: string, riderId: string, available: boolean) {
    return this.request(`/admin/riders/${riderId}/availability`, {
      method: "PATCH",
      token,
      body: { available },
    });
  },

  toggleMyAvailability(token: string, available: boolean) {
    return this.request("/riders/me/availability", {
      method: "PATCH",
      token,
      body: { available },
    });
  },
};
