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
    origin_address: z.string().min(1, "Origin address is required"),
    origin_lat: latitudeSchema,
    origin_lng: longitudeSchema,
    destination_address: z.string().min(1, "Destination address is required"),
    destination_lat: latitudeSchema,
    destination_lng: longitudeSchema,
    quote_id: z.string().uuid("Quote id must be a valid UUID"),
    payment_method: z.enum(["cash", "transfer"], {
      errorMap: () => ({
        message: "Payment method must be cash or transfer",
      }),
    }),
  })
  .superRefine((data, context) => {
    const fields = [
      data.origin_lat,
      data.origin_lng,
      data.destination_lat,
      data.destination_lng,
    ];
    const hasAnyCoordinate = fields.some((value) => value !== undefined);
    const hasAllCoordinates = fields.every((value) => value !== undefined);

    if (hasAnyCoordinate && !hasAllCoordinates) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Origin and destination require complete latitude and longitude pairs",
        path: ["origin_lat"],
      });
    }
  });

export type CreateErrandInput = z.infer<typeof createErrandSchema>;
export type RouteEstimateRequest = z.infer<typeof routeEstimateRequestSchema>;
