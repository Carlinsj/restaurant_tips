import { z } from "zod";

export const providerSchema = z.enum([
  "GENERIC_API",
  "CSV_IMPORT",
  "MANUAL",
  "MOCK",
  "PETPOOJA",
  "RESTROWORKS",
  "CUSTOM",
]);

const credentialsSchema = z.record(z.string(), z.string().max(2_000)).default({});

export const integrationCreateSchema = z.object({
  provider: providerSchema,
  displayName: z.string().trim().min(2).max(80),
  settings: z.record(z.string(), z.unknown()).default({}),
  credentials: credentialsSchema,
});

export const integrationUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  credentials: credentialsSchema.optional(),
  status: z.enum(["DISCONNECTED", "CONNECTED", "ERROR", "DISABLED"]).optional(),
});

export const mappingUpdateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EMPLOYEE"),
    mappingId: z.string().min(1),
    employeeId: z.string().min(1).nullable(),
    status: z.enum(["PENDING", "MAPPED", "IGNORED"]),
  }),
  z.object({
    type: z.literal("TABLE"),
    mappingId: z.string().min(1),
    tableId: z.string().min(1).nullable(),
    status: z.enum(["PENDING", "MAPPED", "IGNORED"]),
  }),
]);

export const csvContentSchema = z.object({
  csvContent: z.string().min(1).max(5_000_000),
});
