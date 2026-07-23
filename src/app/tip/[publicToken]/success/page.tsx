import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, HeartHandshake, Home, ReceiptText, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/currency";
import { getPrisma } from "@/lib/database/prisma";

export const metadata: Metadata = { title: "Tip confirmed" };

export default async function TipSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<{ amount?: string; tip?: string }>;
}) {
  const [{ publicToken }, query] = await Promise.all([params, searchParams]);
  const isDemo = publicToken === "demo-bill";

  let amountPaise = 0;
  let billNumber = "INV-1024-DEMO";
  let tableNumber = 6;

  if (isDemo) {
    const parsedAmount = Number(query.amount);
    amountPaise = Number.isSafeInteger(parsedAmount) && parsedAmount >= 0 ? parsedAmount : 0;
  } else {
    if (!query.tip) notFound();
    const tip = await getPrisma().tip.findFirst({
      where: {
        id: query.tip,
        status: "CONFIRMED",
        bill: { publicToken },
      },
      select: {
        amountPaise: true,
        bill: {
          select: {
            billNumber: true,
            table: { select: { number: true } },
          },
        },
      },
    });
    if (!tip) notFound();
    amountPaise = tip.amountPaise;
    billNumber = tip.bill.billNumber;
    tableNumber = tip.bill.table.number;
  }

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
            {isDemo ? "Demo complete" : "Confirmed"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            {isDemo ? "That is the complete customer flow" : "Thank you for your kindness"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {isDemo
              ? "No tip was recorded and no payment method was charged."
              : amountPaise > 0
                ? `Your ${formatInr(amountPaise)} tip was recorded for the team that served Table ${tableNumber}.`
                : "Your choice was recorded. Thank you for dining with us."}
          </p>

          {amountPaise > 0 && (
            <div className="mt-6 rounded-2xl bg-[#173a34] p-5 text-white">
              <HeartHandshake className="mx-auto size-5 text-[#f5c95f]" aria-hidden="true" />
              <p className="mt-3 text-xs text-white/50">{isDemo ? "Example tip" : "Tip recorded"}</p>
              <p className="font-tabular mt-1 text-3xl font-semibold tracking-[-0.04em]">
                {formatInr(amountPaise)}
              </p>
              <p className="mt-2 text-[10px] text-[#9bc4b5]">
                {isDemo ? "Demonstration only · no database write" : "Allocation saved in paise · no rounding gap"}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ReceiptText className="size-3" aria-hidden="true" /> Bill {billNumber}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3" aria-hidden="true" /> {isDemo ? "Demo" : "Auditable"}
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
