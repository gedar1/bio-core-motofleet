import { z } from "zod";
import { emailSchema, passwordSchema, phoneSchema } from "./base.schemas.js";

export const createUserSchema = z.object({
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
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
