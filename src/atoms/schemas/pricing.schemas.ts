import { z } from "zod";

export const createPricingRuleSchema = z.object({
  errand_type: z.enum(["object_transport", "purchase", "errand"], {
    errorMap: () => ({
      message: "Errand type must be object_transport, purchase or errand",
    }),
  }),
  base_rate: z
    .number()
    .finite("Base rate must be a finite COP amount")
    .int("Base rate must be an integer COP amount")
    .min(1, "Base rate must be at least 1 COP")
    .max(999999, "Base rate must be at most 999,999 COP"),
  rate_per_km: z
    .number()
    .finite("Rate per km must be a finite COP amount")
    .int("Rate per km must be an integer COP amount")
    .min(0, "Rate per km must be at least 0 COP")
    .max(9999, "Rate per km must be at most 9,999 COP"),
  commission_percentage: z
    .number()
    .finite("Commission must be a finite percentage")
    .int("Commission must be a whole percentage")
    .min(1, "Commission must be at least 1%")
    .max(50, "Commission must be at most 50%"),
});

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
