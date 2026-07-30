import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { calculateTableLoadAllocation } from "@/lib/tips";

export const DEMO_LEDGER_COOKIE = "tipsathi_demo_ledger";

const DEMO_LEDGER_ISSUER = "tipsathi-demo";
const DEMO_LEDGER_AUDIENCE = "tipsathi-demo-ledger";
const DEMO_LEDGER_DURATION_SECONDS = 60 * 60 * 8;
const MAX_RECENT_EVENTS = 8;
const MAX_DEMO_SUBMISSIONS = 20;

const eventSchema = z.object({
  id: z.string().uuid(),
  key: z.string().regex(/^[a-f0-9]{16}$/),
  amountPaise: z.number().int().min(0).max(200_000),
  percentage: z.number().int().min(0).max(100).nullable(),
  createdAt: z.number().int().positive(),
  arjunPaise: z.number().int().min(0).max(200_000),
  priyaPaise: z.number().int().min(0).max(200_000),
});

const ledgerSchema = z
  .object({
    version: z.literal(2),
    totalPaise: z.number().int().min(0).max(4_000_000),
    arjunPaise: z.number().int().min(0).max(4_000_000),
    priyaPaise: z.number().int().min(0).max(4_000_000),
    tipCount: z.number().int().min(0).max(MAX_DEMO_SUBMISSIONS),
    submissionCount: z.number().int().min(0).max(MAX_DEMO_SUBMISSIONS),
    events: z.array(eventSchema).max(MAX_RECENT_EVENTS),
  })
  .superRefine((ledger, context) => {
    if (ledger.arjunPaise + ledger.priyaPaise !== ledger.totalPaise) {
      context.addIssue({
        code: "custom",
        message: "Demo allocations must equal the recorded total.",
      });
    }
    for (const event of ledger.events) {
      if (event.arjunPaise + event.priyaPaise !== event.amountPaise) {
        context.addIssue({
          code: "custom",
          message: "A demo event allocation does not balance.",
        });
      }
    }
  });

export type DemoTipEvent = z.infer<typeof eventSchema>;
export type DemoLedger = z.infer<typeof ledgerSchema>;

export class DemoLedgerLimitError extends Error {
  constructor() {
    super("This demo session has reached its tip limit.");
    this.name = "DemoLedgerLimitError";
  }
}

function demoSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

function idempotencyHash(idempotencyKey: string): string {
  return createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 16);
}

export function createEmptyDemoLedger(): DemoLedger {
  return {
    version: 2,
    totalPaise: 0,
    arjunPaise: 0,
    priyaPaise: 0,
    tipCount: 0,
    submissionCount: 0,
    events: [],
  };
}

export function appendDemoTip(
  ledger: DemoLedger,
  input: {
    amountPaise: number;
    percentage: number | null;
    idempotencyKey: string;
    now?: number;
  },
): { ledger: DemoLedger; event: DemoTipEvent; duplicate: boolean } {
  const key = idempotencyHash(input.idempotencyKey);
  const duplicate = ledger.events.find((event) => event.key === key);
  if (duplicate) return { ledger, event: duplicate, duplicate: true };
  if (ledger.submissionCount >= MAX_DEMO_SUBMISSIONS) {
    throw new DemoLedgerLimitError();
  }

  const allocations =
    input.amountPaise > 0
      ? calculateTableLoadAllocation(
          input.amountPaise,
          "table-6",
          [
            { employeeId: "W001", tableId: "table-3" },
            { employeeId: "W001", tableId: "table-6" },
            { employeeId: "R001", tableId: "table-2" },
            { employeeId: "R001", tableId: "table-3" },
            { employeeId: "R001", tableId: "table-6" },
          ],
        )
      : [];
  const arjunPaise =
    allocations.find((allocation) => allocation.employeeId === "W001")
      ?.amountPaise ?? 0;
  const priyaPaise =
    allocations.find((allocation) => allocation.employeeId === "R001")
      ?.amountPaise ?? 0;
  const event: DemoTipEvent = {
    id: randomUUID(),
    key,
    amountPaise: input.amountPaise,
    percentage: input.percentage,
    createdAt: input.now ?? Date.now(),
    arjunPaise,
    priyaPaise,
  };

  return {
    ledger: ledgerSchema.parse({
      version: 2,
      totalPaise: ledger.totalPaise + input.amountPaise,
      arjunPaise: ledger.arjunPaise + arjunPaise,
      priyaPaise: ledger.priyaPaise + priyaPaise,
      tipCount: ledger.tipCount + (input.amountPaise > 0 ? 1 : 0),
      submissionCount: ledger.submissionCount + 1,
      events: [event, ...ledger.events].slice(0, MAX_RECENT_EVENTS),
    }),
    event,
    duplicate: false,
  };
}

export async function createDemoLedgerToken(
  ledger: DemoLedger,
): Promise<string> {
  const validated = ledgerSchema.parse(ledger);
  return new SignJWT(validated)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(DEMO_LEDGER_ISSUER)
    .setAudience(DEMO_LEDGER_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${DEMO_LEDGER_DURATION_SECONDS}s`)
    .sign(demoSecret());
}

export async function readDemoLedgerToken(
  token: string,
): Promise<DemoLedger | null> {
  try {
    const { payload } = await jwtVerify(token, demoSecret(), {
      algorithms: ["HS256"],
      issuer: DEMO_LEDGER_ISSUER,
      audience: DEMO_LEDGER_AUDIENCE,
    });
    return ledgerSchema.parse(payload);
  } catch {
    return null;
  }
}

export async function readDemoLedger(): Promise<DemoLedger> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_LEDGER_COOKIE)?.value;
  if (!token) return createEmptyDemoLedger();
  return (await readDemoLedgerToken(token)) ?? createEmptyDemoLedger();
}

export async function recordDemoTip(input: {
  amountPaise: number;
  percentage: number | null;
  idempotencyKey: string;
}): Promise<{ event: DemoTipEvent; duplicate: boolean }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_LEDGER_COOKIE)?.value;
  const current = token
    ? (await readDemoLedgerToken(token)) ?? createEmptyDemoLedger()
    : createEmptyDemoLedger();
  const result = appendDemoTip(current, input);

  if (!result.duplicate) {
    cookieStore.set(
      DEMO_LEDGER_COOKIE,
      await createDemoLedgerToken(result.ledger),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: DEMO_LEDGER_DURATION_SECONDS,
        path: "/",
        priority: "high",
      },
    );
  }
  return { event: result.event, duplicate: result.duplicate };
}
