import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Check,
  HeartHandshake,
  Home,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { getPrisma } from "@/lib/database/prisma";
import { isDatabaseReachable } from "@/lib/database/reachability";
import { readDemoLedger } from "@/lib/demo-ledger";

export const metadata: Metadata = { title: "Tip submitted" };

export default async function TipSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<{ tip?: string }>;
}) {
  const [{ publicToken }, query] = await Promise.all([params, searchParams]);
  const isDemo = publicToken === "demo-bill";

  let amountPaise = 0;
  let billNumber = "INV-1024-DEMO";
  let tableNumber = 6;
  let currency = "INR";
  let tipStatus: string | null = null;
  let allocations: { name: string; amountPaise: number }[] = [];

  if (!query.tip) notFound();
  const demoEvent = isDemo
    ? (await readDemoLedger()).events.find((event) => event.id === query.tip)
    : null;
  if (demoEvent) {
    amountPaise = demoEvent.amountPaise;
    tipStatus = "CONFIRMED";
    allocations = [
      { name: "Arjun Mehta", amountPaise: demoEvent.arjunPaise },
      { name: "Priya Shah", amountPaise: demoEvent.priyaPaise },
    ].filter((allocation) => allocation.amountPaise > 0);
  } else {
    if (isDemo && !(await isDatabaseReachable())) notFound();
    const tip = await getPrisma().tip.findFirst({
      where: {
        id: query.tip,
        status: { in: ["PENDING", "CONFIRMED"] },
        bill: { publicToken },
      },
      select: {
        amountPaise: true,
        status: true,
        allocations: {
          select: {
            amountPaise: true,
            employee: { select: { name: true } },
          },
          orderBy: { amountPaise: "desc" },
        },
        bill: {
          select: {
            billNumber: true,
            restaurant: { select: { currency: true } },
            table: { select: { number: true } },
          },
        },
      },
    });
    if (!tip) notFound();
    amountPaise = tip.amountPaise;
    billNumber = tip.bill.billNumber;
    tableNumber = tip.bill.table.number;
    currency = tip.bill.restaurant.currency;
    tipStatus = tip.status;
    allocations = tip.allocations.map((allocation) => ({
      name: allocation.employee.name,
      amountPaise: allocation.amountPaise,
    }));
  }
  const isRecordedDemo = isDemo && tipStatus === "CONFIRMED";

  return (
    <main className="flex min-h-screen flex-col bg-[#f7f2e8]">
      <header className="mx-auto flex h-16 w-full max-w-lg items-center px-4">
        <Brand />
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 pb-20">
        <section className="w-full rounded-[28px] border border-[#ded5c6] bg-white p-6 text-center shadow-[0_26px_80px_rgba(47,56,50,0.10)] sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#e2efe8] text-primary">
            <Check className="size-7" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-semibold tracking-wider text-primary uppercase">
            {isRecordedDemo
              ? "Practice applied"
                : "Submitted"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            {isRecordedDemo
              ? "Practice flow reflected"
                : "Thank you for your kindness"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {isRecordedDemo
              ? `${formatCurrency(amountPaise, currency)} was confirmed for Table ${tableNumber} and allocated to the assigned team below. No payment was charged.`
              : amountPaise > 0
                ? `Your ${formatCurrency(amountPaise, currency)} tip selection was submitted for Table ${tableNumber}. It will appear in earnings after the restaurant's payment record confirms it.`
                : "Your choice was recorded. Thank you for dining with us."}
          </p>

          {amountPaise > 0 && (
            <div className="mt-6 rounded-2xl bg-[#173a34] p-5 text-white">
              <HeartHandshake className="mx-auto size-5 text-[#f5c95f]" aria-hidden="true" />
              <p className="mt-3 text-xs text-white/50">{isDemo ? "Selected tip" : "Tip submitted"}</p>
              <p className="font-tabular mt-1 text-3xl font-semibold tracking-[-0.04em]">
                {formatCurrency(amountPaise, currency)}
              </p>
              <p className="mt-2 text-[10px] text-[#9bc4b5]">
                {isRecordedDemo
                  ? "Temporary practice data · no payment charged"
                    : "Awaiting payment confirmation"}
              </p>
              {isRecordedDemo && allocations.length > 0 && (
                <div className="mt-4 divide-y divide-white/10 border-t border-white/10 pt-2 text-xs">
                  {allocations.map((allocation) => (
                    <div
                      key={allocation.name}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-white/65">{allocation.name}</span>
                      <strong className="font-tabular">
                        {formatCurrency(allocation.amountPaise, currency)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ReceiptText className="size-3" aria-hidden="true" /> Bill {billNumber}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3" aria-hidden="true" />{" "}
              {isRecordedDemo ? "Practice only" : "Auditable"}
            </span>
          </div>
          <Button variant="outline" asChild className="mt-7 w-full">
            <Link href="/">
              <Home className="size-4" /> Done
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
