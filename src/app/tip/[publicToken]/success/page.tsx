import Link from "next/link";
import type { Metadata } from "next";
import { Check, HeartHandshake, Home, ReceiptText, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/currency";

export const metadata: Metadata = { title: "Tip confirmed" };

export default async function TipSuccessPage({ searchParams }: { searchParams: Promise<{ amount?: string }> }) {
  const { amount } = await searchParams;
  const amountPaise = Number.isSafeInteger(Number(amount)) ? Number(amount) : 0;
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f2e8]">
      <header className="mx-auto flex h-16 w-full max-w-lg items-center px-4"><Brand /></header>
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 pb-20">
        <section className="w-full rounded-[28px] border border-[#ded5c6] bg-white p-6 text-center shadow-[0_26px_80px_rgba(47,56,50,0.10)] sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#e2efe8] text-primary"><Check className="size-7" strokeWidth={2.5} /></span>
          <p className="mt-6 text-xs font-semibold tracking-wider text-primary uppercase">Confirmed</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Thank you for your kindness</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{amountPaise > 0 ? `Your ${formatInr(amountPaise)} tip has been securely recorded for the team that served Table 6.` : "Your choice has been recorded. Thank you for dining with us."}</p>
          {amountPaise > 0 && <div className="mt-6 rounded-2xl bg-[#173a34] p-5 text-white"><HeartHandshake className="mx-auto size-5 text-[#f5c95f]" /><p className="mt-3 text-xs text-white/50">Tip recorded</p><p className="font-tabular mt-1 text-3xl font-semibold tracking-[-0.04em]">{formatInr(amountPaise)}</p><p className="mt-2 text-[10px] text-[#9bc4b5]">Allocation saved in paise · No rounding gap</p></div>}
          <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ReceiptText className="size-3" /> Bill INV-1024</span><span className="flex items-center gap-1"><ShieldCheck className="size-3" /> Auditable</span></div>
          <Button variant="outline" asChild className="mt-7 w-full"><Link href="/"><Home className="size-4" /> Done</Link></Button>
        </section>
      </div>
    </main>
  );
}
