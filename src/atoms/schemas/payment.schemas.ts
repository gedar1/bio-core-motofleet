import { z } from "zod";

export const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  payment_date: z.string().refine(
    (val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return date <= today;
    },
    { message: "Payment date cannot be a future date" },
  ),
  payment_method: z.enum(["cash", "transfer"], {
    errorMap: () => ({
      message: "Payment method must be cash or transfer",
    }),
  }),
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Period must have format YYYY-MM"),
  notes: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
