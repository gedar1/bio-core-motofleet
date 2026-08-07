import { z } from "zod";

// --- Base schemas ---

export const emailSchema = z
  .string()
  .email("Email must have a valid format")
  .refine(
    (val) => {
      const parts = val.split("@");
      return parts.length === 2 && parts[1].includes(".");
    },
    {
      message:
        "Email must contain @ followed by a domain with at least one dot",
    },
  );

export const phoneSchema = z
  .string()
  .regex(
    /^\d{7,15}$/,
    "Phone must contain only digits with length between 7 and 15",
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((val) => /\d/.test(val), {
    message: "Password must contain at least one digit",
  });

// --- User schema ---

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

// --- Rider schema ---

const futureDateSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  },
  { message: "Date must be a future date" },
);

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

// --- Motorcycle schema ---

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

// --- Contract schema ---

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

// --- Payment schema ---

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

// --- Errand schema ---

export const createErrandSchema = z.object({
  type: z.enum(["object_transport", "purchase", "errand"], {
    errorMap: () => ({
      message: "Type must be object_transport, purchase or errand",
    }),
  }),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be at most 500 characters"),
  origin_address: z.string().min(1, "Origin address is required"),
  origin_lat: z.number().optional(),
  origin_lng: z.number().optional(),
  destination_address: z.string().min(1, "Destination address is required"),
  destination_lat: z.number().optional(),
  destination_lng: z.number().optional(),
  payment_method: z.enum(["cash", "transfer"], {
    errorMap: () => ({
      message: "Payment method must be cash or transfer",
    }),
  }),
});

// --- Pricing rule schema ---

export const createPricingRuleSchema = z.object({
  errand_type: z.enum(["object_transport", "purchase", "errand"], {
    errorMap: () => ({
      message: "Errand type must be object_transport, purchase or errand",
    }),
  }),
  base_rate: z
    .number()
    .min(0.01, "Base rate must be at least 0.01")
    .max(999999.99, "Base rate must be at most 999,999.99"),
  rate_per_km: z
    .number()
    .min(0.0, "Rate per km must be at least 0.00")
    .max(9999.99, "Rate per km must be at most 9,999.99"),
  commission_percentage: z
    .number()
    .min(1.0, "Commission must be at least 1.00%")
    .max(50.0, "Commission must be at most 50.00%"),
});

// --- Cosigner schema ---

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

// --- Login schema ---

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// --- Inferred TypeScript types ---

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateRiderInput = z.infer<typeof createRiderSchema>;
export type CreateMotorcycleInput = z.infer<typeof createMotorcycleSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateErrandInput = z.infer<typeof createErrandSchema>;
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type CreateCosignerInput = z.infer<typeof createCosignerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
