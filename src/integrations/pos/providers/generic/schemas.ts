import { z } from "zod";

const relativeEndpointSchema = z
  .string()
  .trim()
  .regex(/^\/(?!\/)/, "Endpoint paths must start with one forward slash.")
  .refine((value) => !value.includes("\\") && !value.includes("@"), "Endpoint path is unsafe.");

export const genericFieldMappingSchema = z.object({
  billId: z.string().min(1),
  billNumber: z.string().min(1),
  outletId: z.string().optional(),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  tipId: z.string().optional(),
  subtotal: z.string().min(1),
  tax: z.string().optional(),
  total: z.string().min(1),
  tip: z.string().optional(),
  currency: z.string().optional(),
  status: z.string().min(1),
  openedAt: z.string().optional(),
  paidAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const genericEmployeeMappingSchema = z.object({
  employeeId: z.string().min(1),
  employeeCode: z.string().optional(),
  name: z.string().min(1),
  role: z.string().optional(),
  isActive: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const genericTableMappingSchema = z.object({
  tableId: z.string().min(1),
  tableNumber: z.string().optional(),
  name: z.string().min(1),
  capacity: z.string().optional(),
  isActive: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const genericOutletMappingSchema = z.object({
  outletId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().optional(),
  timezone: z.string().optional(),
});

export const genericPosSettingsSchema = z.object({
  baseUrl: z.string().url(),
  authType: z.enum(["NONE", "API_KEY", "BEARER_TOKEN", "BASIC_AUTH"]),
  apiKeyHeaderName: z
    .string()
    .regex(/^[A-Za-z0-9-]+$/)
    .optional(),
  timeoutMs: z.number().int().min(1_000).max(30_000).default(8_000),
  moneyUnit: z.enum(["RUPEES", "PAISE"]).default("RUPEES"),
  endpoints: z.object({
    bills: relativeEndpointSchema.optional(),
    employees: relativeEndpointSchema.optional(),
    tables: relativeEndpointSchema.optional(),
    outlets: relativeEndpointSchema.optional(),
  }),
  responseDataPath: z.string().optional(),
  billFields: genericFieldMappingSchema,
  employeeFields: genericEmployeeMappingSchema.optional(),
  tableFields: genericTableMappingSchema.optional(),
  outletFields: genericOutletMappingSchema.optional(),
  statusMappings: z.record(z.string(), z.enum(["OPEN", "PAID", "CANCELLED", "REFUNDED"])).default({}),
  webhook: z
    .object({
      eventIdPath: z.string().min(1),
      eventTypePath: z.string().min(1),
      dataPath: z.string().min(1),
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
