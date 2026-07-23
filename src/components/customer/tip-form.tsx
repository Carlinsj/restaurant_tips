"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  IndianRupee,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculatePercentageTip, formatInr, parseRupeesToPaise } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type PublicBillDetails = {
  restaurantName: string;
  currency: string;
  tableNumber: number;
  billNumber: string;
  totalPaise: number;
  suggestedPercentages: number[];
  isDemo: boolean;
};

export function TipForm({
  publicBillToken,
  bill,
}: {
  publicBillToken: string;
  bill: PublicBillDetails;
}) {
  const router = useRouter();
  const configuredPercentages = bill.suggestedPercentages
    .filter((value) => value > 0 && value <= 100)
    .slice(0, 3);
  const percentages = configuredPercentages.length > 0 ? configuredPercentages : [5, 10, 15];
  const defaultPercentage = percentages[1] ?? percentages[0] ?? 10;
  const [selection, setSelection] = useState(String(defaultPercentage));
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tipPaise = (() => {
    if (selection === "none") return 0;
    if (selection === "custom") {
      try {
        return customAmount ? parseRupeesToPaise(customAmount) : 0;
      } catch {
        return 0;
      }
    }
    return calculatePercentageTip(bill.totalPaise, Number(selection));
  })();

  async function confirmTip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (selection === "custom" && (!customAmount || tipPaise <= 0)) {
      setError("Enter a valid custom tip amount.");
      return;
    }

    setSubmitting(true);
    const percentage = percentages.some((value) => String(value) === selection)
      ? Number(selection)
      : null;

    if (bill.isDemo) {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      router.push(`/tip/${publicBillToken}/success?amount=${tipPaise}`);
      return;
    }

    try {
      const response = await fetch(`/api/public/tips/${publicBillToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaise: tipPaise,
          percentage,
          customerNote: note || undefined,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = (await response.json()) as { error?: string; tip?: { id: string } };
      if (!response.ok || !result.tip?.id) {
        setError(result.error ?? "The tip could not be confirmed.");
        setSubmitting(false);
        return;
      }
      router.push(`/tip/${publicBillToken}/success?tip=${encodeURIComponent(result.tip.id)}`);
    } catch {
      setError("The connection dropped before confirmation. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <Brand />
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <LockKeyhole className="size-3" aria-hidden="true" />
            {bill.isDemo ? "Demo bill · no data saved" : "Secure bill"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="bg-primary px-5 py-6 text-primary-foreground sm:px-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-amber-300">{bill.restaurantName}</p>
                <p className="mt-1 text-xs text-white/50">Currency · {bill.currency}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-white/65">
                Table {bill.tableNumber}
              </span>
            </div>
            <div className="mt-7 flex items-end justify-between">
              <div>
                <p className="text-xs text-white/50">Bill total</p>
                <p className="font-tabular mt-1 text-3xl font-semibold tracking-[-0.045em]">
                  {formatInr(bill.totalPaise)}
                </p>
              </div>
              <div className="text-end">
                <p className="font-mono text-[9px] text-white/35">BILL</p>
                <p className="font-mono mt-1 text-xs text-white/65">{bill.billNumber}</p>
              </div>
            </div>
          </div>

          <form onSubmit={confirmTip} className="p-5 sm:p-7">
            {bill.isDemo && (
              <Alert role="note" className="mb-5 border-amber-300/50 bg-amber-50 text-amber-900">
                <AlertDescription className="text-xs leading-5 text-amber-800">This is an interactive example. Confirming it will not record a tip or charge a payment method.</AlertDescription>
              </Alert>
            )}

            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.025em]">Would you like to leave a tip?</h1>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Choose what feels right. Your selection is shared transparently with the service team.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {percentages.map((percentage) => {
                const amount = calculatePercentageTip(bill.totalPaise, percentage);
                const selected = selection === String(percentage);
                return (
                  <Button
                    key={percentage}
                    type="button"
                    variant="outline"
                    aria-pressed={selected}
                    onClick={() => setSelection(String(percentage))}
                    className={cn(
                      "relative h-auto min-h-[76px] flex-col items-start justify-center rounded-xl px-3 py-3 text-start whitespace-normal shadow-none",
                      selected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/10 hover:bg-primary/10"
                        : "border-border bg-muted/25 hover:border-primary/30 hover:bg-primary/5",
                    )}
                  >
                    <span className="text-base font-semibold">{percentage}%</span>
                    <span className="font-tabular mt-1 block text-[11px] text-muted-foreground">
                      {formatInr(amount)}
                    </span>
                    {selected && (
                      <span className="absolute end-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="size-2.5" aria-hidden="true" />
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                aria-pressed={selection === "custom"}
                onClick={() => setSelection("custom")}
                className={cn(
                  "justify-start rounded-lg px-3 text-xs shadow-none",
                  selection === "custom"
                    ? "border-primary bg-primary/10 hover:bg-primary/10"
                    : "border-border bg-muted/25 hover:border-primary/30 hover:bg-primary/5",
                )}
              >
                Custom amount
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-pressed={selection === "none"}
                onClick={() => setSelection("none")}
                className={cn(
                  "justify-start rounded-lg px-3 text-xs shadow-none",
                  selection === "none"
                    ? "border-primary bg-primary/10 hover:bg-primary/10"
                    : "border-border bg-muted/25 hover:border-primary/30 hover:bg-primary/5",
                )}
              >
                No tip
              </Button>
            </div>

            {selection === "custom" && (
              <div className="mt-4 grid gap-2">
                <Label htmlFor="custom-tip">Custom tip</Label>
                <div className="relative">
                  <IndianRupee className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="custom-tip"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder="Enter amount"
                    className="font-tabular h-11 ps-9"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-2">
              <Label htmlFor="note" className="flex items-center gap-2">
                <MessageSquareText className="size-3.5" aria-hidden="true" /> Note for the team
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                placeholder="Share a quick note about your experience"
                className="min-h-20 resize-none"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>
            )}

            <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Bill</span>
                <span className="font-tabular text-xs">{formatInr(bill.totalPaise)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tip</span>
                <span className="font-tabular text-xs">{formatInr(tipPaise)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <strong className="text-sm">Total</strong>
                <strong className="font-tabular text-lg">{formatInr(bill.totalPaise + tipPaise)}</strong>
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-4 w-full text-sm" disabled={submitting}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ReceiptText className="size-4" aria-hidden="true" />}
              {bill.isDemo
                ? selection === "none"
                  ? "Complete demo with no tip"
                  : `Try ${formatInr(tipPaise)} demo tip`
                : selection === "none"
                  ? "Confirm no tip"
                  : `Confirm ${formatInr(tipPaise)} tip`}
              <ChevronRight className="ms-auto size-4" aria-hidden="true" />
            </Button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3" aria-hidden="true" />
              {bill.isDemo
                ? "Demo only · no payment or database write"
                : "TipSathi records your choice; the restaurant’s payment system handles payment."}
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
