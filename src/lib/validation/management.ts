import { JobType, ShiftStatus } from "@prisma/client";
import { z } from "zod";

export const employeeCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  employeeCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.toUpperCase()),
  pin: z.string().regex(/^\d{4,6}$/),
  jobType: z.nativeEnum(JobType),
});

export const tableCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  number: z.number().int().positive().max(999),
  capacity: z.number().int().positive().max(50),
});

export const shiftCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  businessDate: z.coerce.date(),
});

export const manualBillSchema = z.object({
  shiftId: z.string().min(1),
  tableId: z.string().min(1),
  billNumber: z.string().trim().min(1).max(60),
  subtotalPaise: z.number().int().min(0).max(1_000_000_000),
  taxPaise: z.number().int().min(0).max(1_000_000_000).default(0),
  totalPaise: z.number().int().positive().max(1_000_000_000),
});

export const manualTipSchema = z.object({
  billId: z.string().min(1),
  amountPaise: z.number().int().positive().max(10_000_000),
  method: z.enum(["CASH", "MANUAL"]),
  reason: z.string().trim().min(3).max(300),
});

const allowedShiftTransitions: Record<ShiftStatus, ShiftStatus[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["OPEN", "CLOSED"],
  CLOSED: ["UNDER_REVIEW", "PAID"],
  PAID: [],
};

export function isValidShiftTransition(
  current: ShiftStatus,
  next: ShiftStatus,
): boolean {
  return allowedShiftTransitions[current].includes(next);
}
