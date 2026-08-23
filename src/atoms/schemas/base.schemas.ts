import { z } from "zod";

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

export const futureDateSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  },
  { message: "Date must be a future date" },
);

export const latitudeSchema = z
  .number()
  .finite("Latitude must be a finite number")
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90");

export const longitudeSchema = z
  .number()
  .finite("Longitude must be a finite number")
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180");
