import { z } from "zod";

const relativeEndpointSchema = z
  .string()
  .trim()
  .max(512)
  .regex(/^\/(?!\/)/, "Endpoint paths must start with one forward slash.")
  .refine((value) => !value.includes("\\") && !value.includes("@"), "Endpoint path is unsafe.");

const requiredPathSchema = z.string().trim().min(1).max(256);
const optionalPathSchema = requiredPathSchema.optional();

export const genericFieldMappingSchema = z.object({
  billId: requiredPathSchema,
  billNumber: requiredPathSchema,
  outletId: optionalPathSchema,
  tableId: optionalPathSchema,
  tableName: optionalPathSchema,
  employeeId: optionalPathSchema,
  employeeName: optionalPathSchema,
  tipId: optionalPathSchema,
  subtotal: requiredPathSchema,
  tax: optionalPathSchema,
  total: requiredPathSchema,
  tip: optionalPathSchema,
  currency: optionalPathSchema,
  status: requiredPathSchema,
  openedAt: optionalPathSchema,
  paidAt: optionalPathSchema,
  updatedAt: optionalPathSchema,
});

export const genericEmployeeMappingSchema = z.object({
  employeeId: requiredPathSchema,
  employeeCode: optionalPathSchema,
  name: requiredPathSchema,
  role: optionalPathSchema,
  isActive: optionalPathSchema,
  updatedAt: optionalPathSchema,
});

export const genericTableMappingSchema = z.object({
  tableId: requiredPathSchema,
  tableNumber: optionalPathSchema,
  name: requiredPathSchema,
  capacity: optionalPathSchema,
  isActive: optionalPathSchema,
  updatedAt: optionalPathSchema,
});

export const genericOutletMappingSchema = z.object({
  outletId: requiredPathSchema,
  name: requiredPathSchema,
  code: optionalPathSchema,
  timezone: optionalPathSchema,
});

export const genericPosSettingsSchema = z.object({
  baseUrl: z.string().url().max(2048),
  authType: z.enum(["NONE", "API_KEY", "BEARER_TOKEN", "BASIC_AUTH"]),
  apiKeyHeaderName: z
    .string()
    .regex(/^[A-Za-z0-9-]+$/)
    .optional(),
  timeoutMs: z.number().int().min(1_000).max(30_000).default(8_000),
  moneyUnit: z.enum(["MAJOR", "MINOR", "RUPEES", "PAISE"]).default("MAJOR"),
  defaultCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("INR"),
  minorUnitDigits: z.number().int().min(0).max(3).optional(),
  endpoints: z.object({
    bills: relativeEndpointSchema.optional(),
    employees: relativeEndpointSchema.optional(),
    tables: relativeEndpointSchema.optional(),
    outlets: relativeEndpointSchema.optional(),
  }),
  responseDataPath: optionalPathSchema,
  billFields: genericFieldMappingSchema,
  employeeFields: genericEmployeeMappingSchema.optional(),
  tableFields: genericTableMappingSchema.optional(),
  outletFields: genericOutletMappingSchema.optional(),
  statusMappings: z.record(z.string(), z.enum(["OPEN", "PAID", "CANCELLED", "REFUNDED"])).default({}),
  webhook: z
    .object({
      eventIdPath: requiredPathSchema,
      eventTypePath: requiredPathSchema,
      dataPath: requiredPathSchema,
      eventTypeMappings: z.record(
        z.string(),
        z.enum([
          "BILL_CREATED",
          "BILL_UPDATED",
          "BILL_PAID",
          "BILL_CANCELLED",
          "BILL_REFUNDED",
          "TIP_CONFIRMED",
          "PAYMENT_CONFIRMED",
          "EMPLOYEE_UPDATED",
          "TABLE_UPDATED",
          "UNKNOWN",
        ]),
      ).default({}),
    })
    .optional(),
});

export type GenericPosSettings = z.infer<typeof genericPosSettingsSchema>;

export const unknownRecordSchema = z.record(z.string(), z.unknown());
export const unknownRecordArraySchema = z.array(unknownRecordSchema);
