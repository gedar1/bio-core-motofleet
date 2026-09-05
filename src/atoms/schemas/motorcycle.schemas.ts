import { z } from "zod";
import { futureDateSchema } from "./base.schemas.js";

export const createMotorcycleSchema = z.object({
  plate: z
    .string()
    .min(5, "Plate must be between 5 and 7 characters")
    .max(7, "Plate must be between 5 and 7 characters")
    .regex(/^[A-Za-z0-9]+$/, "Plate must be alphanumeric"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .int()
    .min(1970, "Year must be at least 1970")
    .max(
      new Date().getFullYear() + 1,
      `Year must be at most ${new Date().getFullYear() + 1}`,
    ),
  color: z.string().min(1, "Color is required"),
  engine_cc: z
    .number()
    .int()
    .min(50, "Engine CC must be at least 50")
    .max(2000, "Engine CC must be at most 2000"),
  soat_expiry: futureDateSchema,
  inspection_expiry: futureDateSchema,
});

export type CreateMotorcycleInput = z.infer<typeof createMotorcycleSchema>;

export const updateMotorcycleSchema = createMotorcycleSchema
  .pick({
    color: true,
    engine_cc: true,
    soat_expiry: true,
    inspection_expiry: true,
  })
  .partial()
  .strict();

export type UpdateMotorcycleInput = z.infer<typeof updateMotorcycleSchema>;
