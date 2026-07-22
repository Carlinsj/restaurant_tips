export type AllocationKind =
  | "DIRECT"
  | "TABLE_SPLIT"
  | "POOL"
  | "REVERSAL";

export type ShareInput = {
  employeeId: string;
  share: number;
};

export type TipAllocationResult = {
  employeeId: string;
  amountPaise: number;
  kind: AllocationKind;
  share: number;
  totalShares: number;
  remainderPaise: number;
};

export type HybridInput = {
  amountPaise: number;
  directPercentage: number;
  poolPercentage: number;
  directRecipients: ShareInput[];
  poolRecipients: ShareInput[];
};
