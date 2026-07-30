import { z } from "zod";

const optionalDateSchema = z
  .union([z.string(), z.number(), z.date()])
  .transform((value, context) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "Invalid date." });
      return z.NEVER;
    }
    return date;
  })
  .optional();

const minorAmountSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const normalizedWebhookSettingsSchema = z.object({
  defaultCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("INR"),
});

const billSchema = z.object({
  id: z.string().trim().min(1),
  number: z.string().trim().min(1),
  outletId: z.string().trim().min(1).optional(),
  tableId: z.string().trim().min(1).optional(),
  tableName: z.string().trim().min(1).optional(),
  employeeId: z.string().trim().min(1).optional(),
  employeeName: z.string().trim().min(1).optional(),
  tipId: z.string().trim().min(1).optional(),
  subtotalMinor: minorAmountSchema,
  taxMinor: minorAmountSchema.default(0),
  totalMinor: minorAmountSchema,
  tipMinor: minorAmountSchema.optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  status: z.enum(["OPEN", "PAID", "CANCELLED", "REFUNDED"]),
  openedAt: optionalDateSchema,
  paidAt: optionalDateSchema,
  updatedAt: optionalDateSchema,
});

const employeeSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1).optional(),
  isActive: z.boolean().default(true),
  updatedAt: optionalDateSchema,
});

const tableSchema = z.object({
  id: z.string().trim().min(1),
  number: z.number().int().positive().optional(),
  name: z.string().trim().min(1),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  updatedAt: optionalDateSchema,
});

export const normalizedWebhookEventSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum([
    "BILL_CREATED",
    "BILL_UPDATED",
    "BILL_PAID",
    "BILL_CANCELLED",
    "BILL_REFUNDED",
    "TIP_CONFIRMED",
    "PAYMENT_CONFIRMED",
    "EMPLOYEE_UPDATED",
    "TABLE_UPDATED",
  ]),
  occurredAt: optionalDateSchema,
  data: z.object({
    bill: billSchema.optional(),
    employee: employeeSchema.optional(),
    table: tableSchema.optional(),
  }),
}).superRefine((event, context) => {
  if (
    (event.type.startsWith("BILL_") ||
      event.type === "TIP_CONFIRMED" ||
      event.type === "PAYMENT_CONFIRMED") &&
    !event.data.bill
  ) {
    context.addIssue({
      code: "custom",
      path: ["data", "bill"],
      message: "This event type requires bill data.",
    });
  }
  if (event.type === "EMPLOYEE_UPDATED" && !event.data.employee) {
    context.addIssue({
      code: "custom",
      path: ["data", "employee"],
      message: "Employee events require employee data.",
    });
  }
  if (event.type === "TABLE_UPDATED" && !event.data.table) {
    context.addIssue({
      code: "custom",
      path: ["data", "table"],
      message: "Table events require table data.",
    });
  }
});

export const normalizedWebhookPayloadSchema = z.union([
  normalizedWebhookEventSchema,
  z.array(normalizedWebhookEventSchema).min(1).max(100),
]);

export type NormalizedWebhookSettings = z.infer<
  typeof normalizedWebhookSettingsSchema
>;
export type NormalizedWebhookEventInput = z.infer<
  typeof normalizedWebhookEventSchema
>;
