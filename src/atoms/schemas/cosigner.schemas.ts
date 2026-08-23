import { z } from "zod";

export const createCosignerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(200, "Address must be at most 200 characters"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .max(20, "Phone must be at most 20 characters"),
  relationship: z
    .string()
    .min(1, "Relationship is required")
    .max(50, "Relationship must be at most 50 characters"),
  identity_document: z
    .string()
    .min(1, "Identity document is required")
    .max(20, "Identity document must be at most 20 characters"),
});

export type CreateCosignerInput = z.infer<typeof createCosignerSchema>;
