import type {
  ErrandQuoteResponse,
  QuoteErrandRequest,
  RouteEstimateRequest,
  RouteEstimateResponse,
} from "../types/api";

import { translateApiError } from "../i18n/errors";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export interface AdminRiderDetails {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  document_type: string | null;
  document_number: string | null;
  license_number: string;
  license_expiry: string;
  insurance_number: string;
  insurance_expiry: string;
  bond_amount: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  status: string;
  available: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminMotorcycleDetails {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  engine_cc: number;
  soat_expiry: string;
  inspection_expiry: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminContractDetails {
  id: string;
  rider_id: string;
  motorcycle_id: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  payment_day: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPricingRuleDetails {
  id: string;
  errand_type: string;
  base_rate: number;
  rate_per_km: number;
  commission_percentage: number;
  active: number | boolean;
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  public readonly originalMessage: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    details?: unknown,
  ) {
    const translated = translateApiError({ code, message, details });
    super(translated.message);
    this.name = "ApiError";
    this.originalMessage = message;
    this.details = translated.details;
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

  // --- In-app notifications ---
  getNotifications(token: string) {
    return this.request<import("../types/api").InAppNotification[]>(
      "/notifications",
      { token },
    );
  },

  getUnreadNotificationCount(token: string) {
    return this.request<{ count: number }>("/notifications/unread-count", {
      token,
    });
  },

  markNotificationRead(token: string, notificationId: string) {
    return this.request<import("../types/api").InAppNotification>(
      `/notifications/${notificationId}/read`,
      { method: "PATCH", token },
    );
  },

  markAllNotificationsRead(token: string) {
    return this.request<{ updated: number }>("/notifications/read-all", {
      method: "PATCH",
      token,
    });
  },

  deleteNotification(token: string, notificationId: string) {
    return this.request<{ deleted: true }>(`/notifications/${notificationId}`, {
      method: "DELETE",
      token,
    });
  },

  // --- Admin ---
  getMotorcycles(token: string) {
    return this.request("/motorcycles", { token });
  },

  getMotorcycle(token: string, motorcycleId: string) {
    return this.request<AdminMotorcycleDetails>(
      `/motorcycles/${motorcycleId}`,
      { token },
    );
  },

  createMotorcycle(token: string, data: Record<string, unknown>) {
    return this.request("/motorcycles", { method: "POST", body: data, token });
  },

  updateMotorcycle(
    token: string,
    motorcycleId: string,
    data: Record<string, unknown>,
  ) {
    return this.request<AdminMotorcycleDetails>(
      `/motorcycles/${motorcycleId}`,
      { method: "PUT", body: data, token },
    );
  },

  getContracts(token: string) {
    return this.request("/contracts", { token });
  },

  getContract(token: string, contractId: string) {
    return this.request<AdminContractDetails>(`/contracts/${contractId}`, {
      token,
    });
  },

  updateContract(
    token: string,
    contractId: string,
    data: Record<string, unknown>,
  ) {
    return this.request<AdminContractDetails>(`/contracts/${contractId}`, {
      method: "PATCH",
      body: data,
      token,
    });
  },

  getPricingRules(token: string) {
    return this.request("/pricing-rules", { token });
  },

  getPricingRule(token: string, ruleId: string) {
    return this.request<AdminPricingRuleDetails>(`/pricing-rules/${ruleId}`, {
      token,
    });
  },

  updatePricingRule(
    token: string,
    ruleId: string,
    data: Record<string, unknown>,
  ) {
    return this.request<AdminPricingRuleDetails>(`/pricing-rules/${ruleId}`, {
      method: "PATCH",
      body: data,
      token,
    });
  },

  getMetrics(token: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const queryString = params.toString();
    const path = queryString
      ? `/admin/metrics?${queryString}`
      : "/admin/metrics";
    return this.request(path, { token });
  },

  getAdminErrands(
    token: string,
    startDate?: string | null,
    endDate?: string | null,
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const queryString = params.toString();
    const path = queryString
      ? `/admin/errands?${queryString}`
      : "/admin/errands";
    return this.request(path, { token });
  },

  getRiders(token: string) {
    return this.request("/admin/riders", { token });
  },

  getRider(token: string, riderId: string) {
    return this.request<AdminRiderDetails>(`/admin/riders/${riderId}`, {
      token,
    });
  },

  updateRider(token: string, riderId: string, data: Record<string, unknown>) {
    return this.request<AdminRiderDetails>(`/admin/riders/${riderId}`, {
      method: "PATCH",
      body: data,
      token,
    });
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
