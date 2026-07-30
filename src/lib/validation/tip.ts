import { z } from "zod";
import { calculatePercentageTip } from "@/lib/currency";

export const publicTipSchema = z
  .object({
    amountPaise: z.number().int().min(0).max(10_000_000),
    percentage: z.number().int().min(0).max(100).nullable().optional(),
    customerNote: z.string().trim().max(300).optional(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const weightedRuleSchema = z.object({
  strategy: z.literal("WEIGHTED"),
  weights: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        weight: z.number().int().positive().max(100),
      }),
    )
    .min(1)
    .refine(
      (weights) => weights.reduce((sum, item) => sum + item.weight, 0) === 100,
      "Tip weights must total 100.",
    ),
});

export function isValidPublicTipAmount(
  billTotalPaise: number,
  tip: { amountPaise: number; percentage?: number | null },
): boolean {
  if (
    !Number.isSafeInteger(billTotalPaise) ||
    billTotalPaise < 0 ||
    tip.amountPaise > billTotalPaise
  ) {
    return false;
  }
  return (
    tip.percentage == null ||
    calculatePercentageTip(billTotalPaise, tip.percentage) === tip.amountPaise
  );
}
