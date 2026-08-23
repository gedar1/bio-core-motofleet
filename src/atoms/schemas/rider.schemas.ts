import { z } from "zod";
import {
  emailSchema,
  futureDateSchema,
  passwordSchema,
  phoneSchema,
} from "./base.schemas.js";

export const riderDocumentTypes = ["CC", "CE", "PPT", "PASAPORTE"] as const;

export type RiderDocumentType = (typeof riderDocumentTypes)[number];

export const documentTypeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(
    z.enum(riderDocumentTypes, {
      errorMap: () => ({
        message: "Document type must be CC, CE, PPT or PASAPORTE",
      }),
    }),
  );

export const documentNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(5, "Document number must be at least 5 characters")
  .max(30, "Document number must be at most 30 characters")
  .regex(
    /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
    "Document number must be alphanumeric and may include hyphens between characters",
  );

export const createRiderSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: emailSchema,
  phone: phoneSchema,
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must be at most 200 characters"),
  password: passwordSchema,
  document_type: documentTypeSchema,
  document_number: documentNumberSchema,
  license_number: z.string().min(1, "License number is required"),
  license_expiry: futureDateSchema,
  insurance_number: z.string().min(1, "Insurance number is required"),
  insurance_expiry: futureDateSchema,
  bond_amount: z.number().positive("Bond amount must be greater than zero"),
  emergency_contact_name: z
    .string()
    .min(1, "Emergency contact name is required"),
  emergency_contact_phone: z
    .string()
    .min(1, "Emergency contact phone is required"),
});

export type CreateRiderInput = z.infer<typeof createRiderSchema>;
