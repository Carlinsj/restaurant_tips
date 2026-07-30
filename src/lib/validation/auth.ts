import { z } from "zod";

export const managerLoginSchema = z.object({
  restaurantCode: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .transform((value) => value.toUpperCase()),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72,
      "Password must not exceed bcrypt's 72-byte limit.",
    ),
});

export const employeeLoginSchema = z.object({
  restaurantCode: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .transform((value) => value.toUpperCase()),
  employeeCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .transform((value) => value.toUpperCase()),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must contain 4 to 6 digits."),
});
