import { allocateByShares } from "./rounding";
import type { ShareInput, TipAllocationResult } from "./types";

export function calculateHoursPool(
  amountPaise: number,
  minutesByEmployee: ShareInput[],
): TipAllocationResult[] {
  return allocateByShares(amountPaise, minutesByEmployee, "POOL");
}
