// Feature: motofleet-mvp, Property 7: Role-based authorization is deterministic

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { roleGuard } from "../../src/middleware/roleGuard.middleware.js";
import type { Role } from "../../src/molecules/IMolecule.js";

/**
 * Property 7: Given the same role and allowed roles list,
 * roleGuard always produces the same result (deterministic).
 * If role IS in allowedRoles → calls next().
 * If role is NOT in allowedRoles → sends 403.
 */
describe("Property 7: Role-based authorization is deterministic", () => {
  const allRoles: Role[] = ["admin", "rider", "user"];

  // Arbitrary for a single role
  const roleArb = fc.constantFrom<Role>("admin", "rider", "user");

  // Arbitrary for a non-empty subset of roles (allowedRoles)
  const allowedRolesArb = fc
    .subarray(allRoles, { minLength: 1, maxLength: 3 })
    .map((arr) => [...arr] as Role[]);

  function createMockReqResNext(userRole: Role | undefined) {
    const req = { user: userRole ? { role: userRole } : undefined } as any;
    const resData: { statusCode?: number; json?: any } = {};
    const res = {
      status(code: number) {
        resData.statusCode = code;
        return res;
      },
      json(data: any) {
        resData.json = data;
        return res;
      },
    } as any;
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    return { req, res, next, resData, getNextCalled: () => nextCalled };
  }

  it("produces the same result for the same inputs (deterministic)", () => {
    fc.assert(
      fc.property(roleArb, allowedRolesArb, (role, allowedRoles) => {
        const middleware = roleGuard(...allowedRoles);

        // Run twice with identical inputs
        const run1 = createMockReqResNext(role);
        middleware(run1.req, run1.res, run1.next);

        const run2 = createMockReqResNext(role);
        middleware(run2.req, run2.res, run2.next);

        // Both runs must produce the same outcome
        expect(run1.getNextCalled()).toBe(run2.getNextCalled());
        expect(run1.resData.statusCode).toBe(run2.resData.statusCode);
      }),
      { numRuns: 100 },
    );
  });

  it("calls next() when role IS in allowedRoles", () => {
    fc.assert(
      fc.property(roleArb, allowedRolesArb, (role, allowedRoles) => {
        // Ensure role is in the allowed set
        if (!allowedRoles.includes(role)) {
          allowedRoles.push(role);
        }

        const middleware = roleGuard(...allowedRoles);
        const { req, res, next, resData, getNextCalled } =
          createMockReqResNext(role);

        middleware(req, res, next);

        expect(getNextCalled()).toBe(true);
        expect(resData.statusCode).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("sends 403 when role is NOT in allowedRoles", () => {
    fc.assert(
      fc.property(roleArb, allowedRolesArb, (role, allowedRoles) => {
        // Ensure role is NOT in the allowed set
        const filtered = allowedRoles.filter((r) => r !== role);
        if (filtered.length === 0) {
          // Skip this case — can't have empty allowedRoles with role excluded
          return;
        }

        const middleware = roleGuard(...filtered);
        const { req, res, next, resData, getNextCalled } =
          createMockReqResNext(role);

        middleware(req, res, next);

        expect(getNextCalled()).toBe(false);
        expect(resData.statusCode).toBe(403);
        expect(resData.json).toEqual({
          status: 403,
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }),
      { numRuns: 100 },
    );
  });

  it("sends 403 when user role is undefined", () => {
    fc.assert(
      fc.property(allowedRolesArb, (allowedRoles) => {
        const middleware = roleGuard(...allowedRoles);
        const { req, res, next, resData, getNextCalled } =
          createMockReqResNext(undefined);

        middleware(req, res, next);

        expect(getNextCalled()).toBe(false);
        expect(resData.statusCode).toBe(403);
      }),
      { numRuns: 100 },
    );
  });
});
