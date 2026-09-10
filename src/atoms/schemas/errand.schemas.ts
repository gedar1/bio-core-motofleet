import { z } from "zod";
import { latitudeSchema, longitudeSchema } from "./base.schemas.js";

export const routeCoordinatesSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export const routeEstimateRequestSchema = z.object({
  origin: routeCoordinatesSchema,
  destination: routeCoordinatesSchema,
});

export const quoteErrandRequestSchema = routeEstimateRequestSchema.extend({
  type: z.enum(["object_transport", "purchase", "errand"], {
    errorMap: () => ({
      message: "Type must be object_transport, purchase or errand",
    }),
  }),
});

const addressInputSchema = z.string().trim().min(1).max(300);
const optionalAddressSchema = z.string().trim().max(300).nullable().optional();
const instructionsSchema = z.string().trim().max(500).nullable().optional();
const optionalLatitudeSchema = latitudeSchema.optional();
const optionalLongitudeSchema = longitudeSchema.optional();

export const createErrandSchema = z
  .object({
    type: z.enum(["object_transport", "purchase", "errand"], {
      errorMap: () => ({
        message: "Type must be object_transport, purchase or errand",
      }),
    }),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(500, "Description must be at most 500 characters"),
    // address is the label confirmed by the user and shown to the rider
    origin_address: addressInputSchema,
    origin_address_input: addressInputSchema.optional(),
    origin_address_resolved: optionalAddressSchema,
    origin_lat: latitudeSchema,
    origin_lng: longitudeSchema,
    origin_exact_lat: optionalLatitudeSchema,
    origin_exact_lng: optionalLongitudeSchema,
    origin_routable_lat: optionalLatitudeSchema,
    origin_routable_lng: optionalLongitudeSchema,
    origin_instructions: instructionsSchema,
    origin_confirmed: z.boolean().optional().default(true),
    destination_address: addressInputSchema,
    destination_address_input: addressInputSchema.optional(),
    destination_address_resolved: optionalAddressSchema,
    destination_lat: latitudeSchema,
    destination_lng: longitudeSchema,
    destination_exact_lat: optionalLatitudeSchema,
    destination_exact_lng: optionalLongitudeSchema,
    destination_routable_lat: optionalLatitudeSchema,
    destination_routable_lng: optionalLongitudeSchema,
    destination_instructions: instructionsSchema,
    destination_confirmed: z.boolean().optional().default(true),
    quote_id: z.string().uuid("Quote id must be a valid UUID"),
    payment_method: z.enum(["cash", "transfer"], {
      errorMap: () => ({
        message: "Payment method must be cash or transfer",
      }),
    }),
  })
  .superRefine((data, context) => {
    const pairs = [
      {
        label: "Origin exact coordinates",
        latitude: data.origin_exact_lat,
        longitude: data.origin_exact_lng,
        path: "origin_exact_lat",
      },
      {
        label: "Origin routable coordinates",
        latitude: data.origin_routable_lat,
        longitude: data.origin_routable_lng,
        path: "origin_routable_lat",
      },
      {
        label: "Destination exact coordinates",
        latitude: data.destination_exact_lat,
        longitude: data.destination_exact_lng,
        path: "destination_exact_lat",
      },
      {
        label: "Destination routable coordinates",
        latitude: data.destination_routable_lat,
        longitude: data.destination_routable_lng,
        path: "destination_routable_lat",
      },
    ];

    for (const pair of pairs) {
      const hasAnyCoordinate =
        pair.latitude !== undefined || pair.longitude !== undefined;
      const hasAllCoordinates =
        pair.latitude !== undefined && pair.longitude !== undefined;

      if (hasAnyCoordinate && !hasAllCoordinates) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${pair.label} require a complete latitude and longitude pair`,
          path: [pair.path],
        });
      }
    }

    if (!data.origin_confirmed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The pickup point must be confirmed",
        path: ["origin_confirmed"],
      });
    }
    if (!data.destination_confirmed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The delivery point must be confirmed",
        path: ["destination_confirmed"],
      });
    }
  });

export type CreateErrandInput = z.infer<typeof createErrandSchema>;
export type RouteEstimateRequest = z.infer<typeof routeEstimateRequestSchema>;
