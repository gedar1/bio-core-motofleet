import { z } from "zod";

const copAmountSchema = (label: string, minimum: number) =>
  z
    .number()
    .finite(`${label} must be a finite COP amount`)
    .int(`${label} must be an integer COP amount`)
    .min(minimum, `${label} must be at least ${minimum} COP`)
    .max(999999, `${label} must be at most 999,999 COP`);

const commissionSchema = z
  .number()
  .finite("Commission must be a finite percentage")
  .int("Commission must be a whole percentage")
  .min(1, "Commission must be at least 1%")
  .max(50, "Commission must be at most 50%");

const pricingRuleFieldsSchema = z.object({
  errand_type: z.enum(["object_transport", "purchase", "errand"], {
    errorMap: () => ({
      message: "Errand type must be object_transport, purchase or errand",
    }),
  }),
  base_rate: copAmountSchema("Base rate", 1),
  rate_per_km: copAmountSchema("Rate per km", 0),
  inside_bello_flat_fare_cop: copAmountSchema(
    "Bello local flat fare",
    1,
  ).default(10000),
  outside_minimum_fare_cop: copAmountSchema(
    "Outside Bello minimum fare",
    1,
  ).default(12000),
  commission_percentage: commissionSchema,
});

export const createPricingRuleSchema = pricingRuleFieldsSchema.superRefine(
  (data, context) => {
    if (data.outside_minimum_fare_cop <= data.inside_bello_flat_fare_cop) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Outside Bello minimum fare must be higher than the Bello local fare",
        path: ["outside_minimum_fare_cop"],
      });
    }
  },
);

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;

export const updatePricingRuleSchema = pricingRuleFieldsSchema
  .omit({ errand_type: true })
  .partial()
  .strict();

export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
