import { z } from "zod";

export const createContractSchema = z
  .object({
    rider_id: z.string().uuid("rider_id must be a valid UUID"),
    motorcycle_id: z.string().uuid("motorcycle_id must be a valid UUID"),
    start_date: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: "start_date must be a valid date",
    }),
    end_date: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: "end_date must be a valid date",
    }),
    monthly_amount: z
      .number()
      .positive("Monthly amount must be greater than zero"),
    payment_day: z
      .number()
      .int()
      .min(1, "Payment day must be at least 1")
      .max(28, "Payment day must be at most 28"),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "end_date must be after start_date",
    path: ["end_date"],
  });

export type CreateContractInput = z.infer<typeof createContractSchema>;
