import { describe, expect, it } from "vitest";
import { createRiderSchema } from "../../src/atoms/schemas.js";

const validRider = {
  name: "María Pérez",
  email: "maria@example.com",
  phone: "3001234567",
  address: "Calle 10 # 20-30",
  password: "SecurePass1",
  document_type: "cc",
  document_number: " ab-12345 ",
  license_number: "LIC-12345",
  license_expiry: "2030-01-01",
  insurance_number: "SEG-12345",
  insurance_expiry: "2030-01-01",
  bond_amount: 500000,
  emergency_contact_name: "Ana Pérez",
  emergency_contact_phone: "3201234567",
};

describe("createRiderSchema identity documents", () => {
  it("normalizes valid document type and number to canonical values", () => {
    const result = createRiderSchema.parse(validRider);

    expect(result.document_type).toBe("CC");
    expect(result.document_number).toBe("AB-12345");
  });

  it("accepts the supported Colombia document types", () => {
    for (const document_type of ["CC", "CE", "PPT", "PASAPORTE"]) {
      expect(
        createRiderSchema.safeParse({ ...validRider, document_type }).success,
      ).toBe(true);
    }
  });

  it("rejects missing, malformed, or out-of-range document numbers", () => {
    for (const document_number of [
      "",
      "AB12",
      "AB--12345",
      "AB_12345",
      "A".repeat(31),
    ]) {
      expect(
        createRiderSchema.safeParse({ ...validRider, document_number }).success,
      ).toBe(false);
    }
  });
});
