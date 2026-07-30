export type AllocationKind =
  | "DIRECT"
  | "TABLE_SPLIT"
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

export type ActiveTableAssignment = {
  employeeId: string;
  tableId: string;
};

export type TableLoadAllocationOptions = {
  allocationKey?: string;
};

export type TableLoadAllocationResult = {
  employeeId: string;
  amountPaise: number;
  kind: "TABLE_SPLIT";
  activeTableCount: number;
  shareBasisPoints: number;
  totalShareBasisPoints: 10_000;
  remainderPaise: number;
  remainderTieBreaker: "HASHED_ALLOCATION_KEY" | "EMPLOYEE_ID";
  remainderSeed: string | null;
};
