import { allocateByShares } from "./rounding";
import type { ShareInput, TipAllocationResult } from "./types";

export function calculatePointsPool(
  amountPaise: number,
  pointsByEmployee: ShareInput[],
): TipAllocationResult[] {
  return allocateByShares(amountPaise, pointsByEmployee, "POOL");
}
