import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../frontend/src/services/api";

function mockResponse(
  body: string,
  status = 200,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("frontend API response handling", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a normal JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(JSON.stringify({ token: "token", role: "user" })),
    );

    await expect(api.login("user@example.com", "Password1")).resolves.toEqual({
      token: "token",
      role: "user",
    });
  });

  it("returns undefined for an empty successful body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(""));

    await expect(api.request("/empty")).resolves.toBeUndefined();
  });

  it("returns text for a successful non-JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse("accepted"));

    await expect(api.request<string>("/text")).resolves.toBe("accepted");
  });

  it("preserves the structured JSON API error contract", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(
        JSON.stringify({
          status: 401,
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
          details: { email: ["Invalid email"] },
        }),
        401,
      ),
    );

    const request = api.login("user@example.com", "wrong");
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
      originalMessage: "Invalid credentials",
      details: { email: expect.any(Array) },
    });
  });

  it("creates a useful ApiError for an empty HTTP error body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse("", 502));

    const request = api.request("/unavailable");
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 502,
      code: "API_ERROR",
    });
    await expect(request).rejects.toThrow(/respuesta no válida/i);
  });

  it("creates a useful ApiError for a non-JSON HTTP error body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse("Bad Gateway", 502));

    const request = api.request("/unavailable");
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 502,
      code: "API_ERROR",
      originalMessage: "Bad Gateway",
    });
  });

  it("normalizes a rejected fetch as a network ApiError", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNRESET"));

    const request = api.login("user@example.com", "Password1");
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      originalMessage: "ECONNRESET",
    });
    await expect(request).rejects.toThrow(/conectar con el servidor/i);
  });

  it("normalizes a body read failure as a network ApiError", async () => {
    const response = mockResponse("");
    vi.mocked(response.text).mockRejectedValue(new Error("ECONNRESET"));
    vi.mocked(fetch).mockResolvedValue(response);

    const request = api.request("/interrupted");
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      originalMessage: "ECONNRESET",
    });
  });
});
