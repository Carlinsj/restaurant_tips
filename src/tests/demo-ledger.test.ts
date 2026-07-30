import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendDemoTip,
  createDemoLedgerToken,
  createEmptyDemoLedger,
  readDemoLedgerToken,
} from "@/lib/demo-ledger";
import {
  employeeDashboardFromDemoLedger,
  managerDashboardFromDemoLedger,
} from "@/lib/demo-ledger-data";

const TEST_SECRET = "demo-ledger-test-secret-that-is-long-enough";
let originalAuthSecret: string | undefined;

beforeEach(() => {
  originalAuthSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = TEST_SECRET;
});

afterEach(() => {
  if (originalAuthSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalAuthSecret;
});

describe("signed offline demo ledger", () => {
  it("records a Table 6 tip and allocates it by active table load", () => {
    const result = appendDemoTip(createEmptyDemoLedger(), {
      amountPaise: 30_000,
      percentage: 15,
      idempotencyKey: randomUUID(),
      now: Date.UTC(2026, 6, 29, 16),
    });

    expect(result.event).toMatchObject({
      amountPaise: 30_000,
      arjunPaise: 18_000,
      priyaPaise: 12_000,
    });
    expect(result.ledger).toMatchObject({
      totalPaise: 30_000,
      arjunPaise: 18_000,
      priyaPaise: 12_000,
      tipCount: 1,
    });
  });

  it("returns the original event for a repeated idempotency key", () => {
    const idempotencyKey = randomUUID();
    const first = appendDemoTip(createEmptyDemoLedger(), {
      amountPaise: 30_000,
      percentage: 15,
      idempotencyKey,
    });
    const repeated = appendDemoTip(first.ledger, {
      amountPaise: 30_000,
      percentage: 15,
      idempotencyKey,
    });

    expect(repeated.duplicate).toBe(true);
    expect(repeated.event.id).toBe(first.event.id);
    expect(repeated.ledger.totalPaise).toBe(30_000);
  });

  it("round-trips a valid ledger and rejects a tampered token", async () => {
    const recorded = appendDemoTip(createEmptyDemoLedger(), {
      amountPaise: 30_000,
      percentage: 15,
      idempotencyKey: randomUUID(),
    });
    const token = await createDemoLedgerToken(recorded.ledger);

    await expect(readDemoLedgerToken(token)).resolves.toMatchObject({
      totalPaise: 30_000,
      arjunPaise: 18_000,
      priyaPaise: 12_000,
    });
    const [header, payload, signature] = token.split(".");
    const tamperedSignature = `${signature.startsWith("a") ? "b" : "a"}${signature.slice(1)}`;
    const tampered = `${header}.${payload}.${tamperedSignature}`;
    await expect(readDemoLedgerToken(tampered)).resolves.toBeNull();
  });

  it("updates manager, payout source data, and Arjun's personal report", () => {
    const { ledger } = appendDemoTip(createEmptyDemoLedger(), {
      amountPaise: 30_000,
      percentage: 15,
      idempotencyKey: randomUUID(),
    });

    const manager = managerDashboardFromDemoLedger(ledger);
    expect(manager.shift.totalTipsPaise).toBe(1_258_000);
    expect(
      manager.employees.find((employee) => employee.code === "W001")
        ?.tipsPaise,
    ).toBe(188_000);
    expect(
      manager.employees.find((employee) => employee.code === "R001")
        ?.tipsPaise,
    ).toBe(98_000);
    expect(manager.tables.find((table) => table.number === 6)).toMatchObject({
      status: "Tip received",
      tipPaise: 30_000,
      tipAllocations: [
        { name: "Arjun", amountPaise: 18_000 },
        { name: "Priya", amountPaise: 12_000 },
      ],
    });

    const employee = employeeDashboardFromDemoLedger(ledger);
    expect(employee.currentShift?.totalPaise).toBe(188_000);
    expect(employee.currentShift?.directPaise).toBe(188_000);
    expect(
      employee.assignedTables.find((table) => table.number === 6),
    ).toMatchObject({ status: "Tip received", earnedPaise: 18_000 });
    expect(employee.recentAllocations[0]).toMatchObject({
      tableNumber: 6,
      amountPaise: 18_000,
    });
  });
});
