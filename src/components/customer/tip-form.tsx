"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, IndianRupee, LoaderCircle, LockKeyhole, MessageSquareText, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Brand } from "@/components/shared/brand";
import { calculatePercentageTip, formatInr, parseRupeesToPaise } from "@/lib/currency";
import { cn } from "@/lib/utils";

const BILL_TOTAL_PAISE = 200_000;

export function TipForm({ publicBillToken }: { publicBillToken: string }) {
  const router = useRouter();
  const [selection, setSelection] = useState<"5" | "10" | "15" | "custom" | "none">("10");
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
    return calculatePercentageTip(BILL_TOTAL_PAISE, Number(selection));
  })();

  async function confirmTip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (selection === "custom" && (!customAmount || tipPaise <= 0)) {
      setError("Enter a valid custom tip amount.");
      return;
    }
    setSubmitting(true);
    const percentage = selection === "5" || selection === "10" || selection === "15" ? Number(selection) : null;
    if (publicBillToken !== "demo-bill") {
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
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(result.error ?? "The tip could not be confirmed.");
          setSubmitting(false);
          return;
        }
      } catch {
        setError("The connection dropped before confirmation. Please try again.");
        setSubmitting(false);
        return;
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
    router.push(`/tip/${publicBillToken}/success?amount=${tipPaise}`);
  }

  return (
    <main className="min-h-screen bg-[#f7f2e8]">
      <header className="mx-auto flex h-16 max-w-lg items-center justify-between px-4"><Brand /><span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><LockKeyhole className="size-3" /> Secure bill</span></header>
      <div className="mx-auto max-w-lg px-4 pb-12 pt-2">
        <section className="overflow-hidden rounded-[28px] border border-[#ded5c6] bg-white shadow-[0_26px_80px_rgba(47,56,50,0.10)]">
          <div className="bg-[#173a34] px-5 py-6 text-white sm:px-7">
            <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-[#f5c95f]">Saffron & Slate</p><p className="mt-1 text-xs text-white/50">Bandra · Mumbai</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-white/65">Table 6</span></div>
            <div className="mt-7 flex items-end justify-between"><div><p className="text-xs text-white/50">Bill total</p><p className="font-tabular mt-1 text-3xl font-semibold tracking-[-0.045em]">{formatInr(BILL_TOTAL_PAISE)}</p></div><div className="text-end"><p className="font-mono text-[9px] text-white/35">BILL</p><p className="font-mono mt-1 text-xs text-white/65">INV-1024</p></div></div>
          </div>

          <form onSubmit={confirmTip} className="p-5 sm:p-7">
            <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e5eee9] text-primary"><Sparkles className="size-4" /></span><div><h1 className="text-lg font-semibold tracking-[-0.025em]">Would you like to leave a tip?</h1><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose what feels right. Your selection is shared transparently with the service team.</p></div></div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {(["5", "10", "15"] as const).map((percentage) => {
                const amount = calculatePercentageTip(BILL_TOTAL_PAISE, Number(percentage));
                const selected = selection === percentage;
                return <button key={percentage} type="button" aria-pressed={selected} onClick={() => setSelection(percentage)} className={cn("relative min-h-[76px] rounded-2xl border p-3 text-start transition", selected ? "border-primary bg-[#e9f2ed] ring-2 ring-primary/10" : "border-[#e5ded3] bg-[#fbf9f4] hover:border-primary/30")}><span className="text-base font-semibold">{percentage}%</span><span className="font-tabular mt-1 block text-[11px] text-muted-foreground">{formatInr(amount)}</span>{selected && <span className="absolute end-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-white"><Check className="size-2.5" /></span>}</button>;
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={selection === "custom"} onClick={() => setSelection("custom")} className={cn("rounded-xl border px-3 py-2.5 text-start text-xs font-medium", selection === "custom" ? "border-primary bg-[#e9f2ed]" : "border-[#e5ded3] bg-[#fbf9f4]")}>Custom amount</button>
              <button type="button" aria-pressed={selection === "none"} onClick={() => setSelection("none")} className={cn("rounded-xl border px-3 py-2.5 text-start text-xs font-medium", selection === "none" ? "border-primary bg-[#e9f2ed]" : "border-[#e5ded3] bg-[#fbf9f4]")}>No tip</button>
            </div>

            {selection === "custom" && <div className="mt-4 grid gap-2"><Label htmlFor="custom-tip">Custom tip</Label><div className="relative"><IndianRupee className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="custom-tip" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} inputMode="decimal" placeholder="Enter amount" className="h-11 ps-9 font-tabular" autoFocus /></div></div>}

            <div className="mt-5 grid gap-2"><Label htmlFor="note" className="flex items-center gap-2"><MessageSquareText className="size-3.5" /> Note for the team <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Share a quick note about your experience" className="min-h-20 resize-none" /></div>

            {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

            <div className="mt-6 rounded-2xl border border-[#e5ded3] bg-[#f9f7f2] p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Bill</span><span className="font-tabular text-xs">{formatInr(BILL_TOTAL_PAISE)}</span></div><div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Tip</span><span className="font-tabular text-xs">{formatInr(tipPaise)}</span></div><div className="mt-3 flex items-center justify-between border-t border-[#e4ddd1] pt-3"><strong className="text-sm">Total</strong><strong className="font-tabular text-lg">{formatInr(BILL_TOTAL_PAISE + tipPaise)}</strong></div></div>

            <Button type="submit" className="mt-4 h-12 w-full rounded-xl text-sm" disabled={submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <ReceiptText className="size-4" />}{selection === "none" ? "Confirm no tip" : `Confirm ${formatInr(tipPaise)} tip`}<ChevronRight className="ms-auto size-4" /></Button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground"><ShieldCheck className="size-3" /> TipSathi records your choice; the restaurant’s payment system handles payment.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
