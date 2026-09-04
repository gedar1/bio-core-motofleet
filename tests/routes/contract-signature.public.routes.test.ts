import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import {
  createContractSignaturePublicRoutes,
} from "../../src/routes/contract-signature.public.routes.js";
import type { ContractSignatureMolecule } from "../../src/molecules/ContractSignatureMolecule.js";
import {
  PublicLinkRateLimiter,
} from "../../src/infrastructure/TokenService.js";
import { MAX_CONTRACT_DOCUMENT_BYTES } from "../../src/infrastructure/DocumentStorage.js";

function makeApp(
  molecule: Partial<ContractSignatureMolecule>,
  rateLimiter = new PublicLinkRateLimiter({
    tokenLimit: 100,
    ipLimit: 100,
    now: () => 1_000,
  }),
) {
  const app = express();
  app.set("trust proxy", true);
  app.use(
    "/public/contract-signatures",
    createContractSignaturePublicRoutes(
      molecule as ContractSignatureMolecule,
      { rateLimiter },
    ),
  );
  return app;
}

function validPublicResult() {
  return {
    kind: "valid" as const,
    signatureCase: { document_status: "enviado" },
    deliveryAttempt: { expires_at: "2030-01-01T00:00:00.000Z" },
  } as ReturnType<ContractSignatureMolecule["getPublicContract"]>;
}

describe("contract signature public routes", () => {
  it("uses only the path token and rejects query-string bearer tokens", async () => {
    const getPublicContract = vi.fn(() => validPublicResult());
    const app = makeApp({ getPublicContract });

    const response = await request(app).get(
      "/public/contract-signatures?token=path-token",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 404,
      code: "LINK_UNAVAILABLE",
      message: "This link is unavailable.",
    });
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).not.toContain("path-token");
    expect(getPublicContract).not.toHaveBeenCalled();
  });

  it("returns a generic 410 response for an expired link without case metadata", async () => {
    const token = "expired-path-token";
    const getPublicContract = vi.fn(() => ({
      kind: "expired" as const,
      expiresAt: "2024-01-01T00:00:00.000Z",
    }));
    const app = makeApp({ getPublicContract });

    const response = await request(app).get(
      `/public/contract-signatures/${token}`,
    );

    expect(response.status).toBe(410);
    expect(response.body).toEqual({
      status: 410,
      code: "LINK_EXPIRED",
      message: "This link has expired.",
      expires_at: "2024-01-01T00:00:00.000Z",
    });
    expect(response.text).not.toContain(token);
    expect(response.text).not.toContain("case_id");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("evaluates token and IP limits independently and returns safe 429 responses", async () => {
    const app = makeApp(
      {
        getPublicContract: vi.fn(() => ({ kind: "invalid" as const })),
      },
      new PublicLinkRateLimiter({
        tokenLimit: 1,
        ipLimit: 2,
        now: () => 10_000,
      }),
    );

    const first = await request(app)
      .get("/public/contract-signatures/same-token")
      .set("X-Forwarded-For", "203.0.113.10");
    const tokenLimited = await request(app)
      .get("/public/contract-signatures/same-token")
      .set("X-Forwarded-For", "203.0.113.11");
    const ipFirst = await request(app)
      .get("/public/contract-signatures/another-token")
      .set("X-Forwarded-For", "203.0.113.10");
    const ipLimited = await request(app)
      .get("/public/contract-signatures/third-token")
      .set("X-Forwarded-For", "203.0.113.10");

    expect(first.status).toBe(404);
    expect(tokenLimited.status).toBe(429);
    expect(ipFirst.status).toBe(404);
    expect(ipLimited.status).toBe(429);
    expect(tokenLimited.body).toEqual({
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many requests.",
    });
    expect(tokenLimited.headers["retry-after"]).toBe("60");
    expect(tokenLimited.headers["referrer-policy"]).toBe("no-referrer");
    expect(tokenLimited.headers["cache-control"]).toBe("no-store");
  });

  it("rejects oversized multipart before invoking uploadSignedDocument with 413", async () => {
    const uploadSignedDocument = vi.fn();
    const app = makeApp({ uploadSignedDocument });
    const boundary = "----motofleet-public-test";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="large.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
        "latin1",
      ),
      Buffer.alloc(MAX_CONTRACT_DOCUMENT_BYTES + 1, 0x41),
      Buffer.from(`\r\n--${boundary}--\r\n`, "latin1"),
    ]);

    const response = await request(app)
      .post("/public/contract-signatures/upload-token/signed")
      .set("Content-Type", `multipart/form-data; boundary=${boundary}`)
      .send(body);

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      status: 413,
      code: "FILE_TOO_LARGE",
      message: "The uploaded file exceeds the 25 MiB limit",
    });
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(uploadSignedDocument).not.toHaveBeenCalled();
  });

  it("keeps parser and unexpected errors generic with security headers", async () => {
    const uploadSignedDocument = vi.fn();
    const getPublicContract = vi.fn(() => {
      throw new Error("internal failure containing should-not-leak");
    });
    const app = makeApp({ uploadSignedDocument, getPublicContract });
    const malformedBoundary = "----malformed";

    const parserError = await request(app)
      .post("/public/contract-signatures/parser-token/signed")
      .set(
        "Content-Type",
        `multipart/form-data; boundary=${malformedBoundary}`,
      )
      .send(Buffer.from("not multipart"));
    const unexpectedError = await request(app).get(
      "/public/contract-signatures/error-token",
    );

    expect(parserError.status).toBe(400);
    expect(unexpectedError.status).toBe(500);
    for (const response of [parserError, unexpectedError]) {
      expect(response.headers["referrer-policy"]).toBe("no-referrer");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.text).not.toContain("token");
      expect(response.text).not.toContain("should-not-leak");
    }
  });

  it("passes an optional matching Rider JWT and denies a mismatching one generically", async () => {
    const getPublicContract = vi.fn(
      (_token: string, riderId?: string) =>
        riderId === "rider-1"
          ? validPublicResult()
          : ({ kind: "invalid" as const }),
    );
    const app = makeApp({ getPublicContract });
    const secret = process.env.JWT_SECRET || "default-secret-change-me";
    const matchingJwt = jwt.sign(
      { id: "rider-1", role: "rider", email: "rider@example.test" },
      secret,
    );
    const mismatchingJwt = jwt.sign(
      { id: "rider-2", role: "rider", email: "other@example.test" },
      secret,
    );

    const matching = await request(app)
      .get("/public/contract-signatures/matching-token")
      .set("Authorization", `Bearer ${matchingJwt}`);
    const mismatching = await request(app)
      .get("/public/contract-signatures/mismatching-token")
      .set("Authorization", `Bearer ${mismatchingJwt}`);

    expect(matching.status).toBe(200);
    expect(mismatching.status).toBe(404);
    expect(mismatching.body).toEqual({
      status: 404,
      code: "LINK_UNAVAILABLE",
      message: "This link is unavailable.",
    });
    expect(getPublicContract).toHaveBeenNthCalledWith(
      1,
      "matching-token",
      "rider-1",
    );
    expect(getPublicContract).toHaveBeenNthCalledWith(
      2,
      "mismatching-token",
      "rider-2",
    );
  });

  it("streams the original with fixed safe download headers", async () => {
    const pdf = Buffer.from("%PDF-1.7\npublic test\n%%EOF");
    const downloadPublicOriginal = vi.fn(async () => ({
      ...validPublicResult(),
      stream: Readable.from(pdf),
      sizeBytes: pdf.length,
    }));
    const app = makeApp({ downloadPublicOriginal });

    const response = await request(app).get(
      "/public/contract-signatures/download-token/original",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/pdf/);
    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="contract-original.pdf"',
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(Buffer.compare(response.body, pdf)).toBe(0);
  });
});
