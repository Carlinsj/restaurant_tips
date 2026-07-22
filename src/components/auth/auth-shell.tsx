import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/shared/brand";

export function AuthShell({
  title,
  description,
  alternate,
  children,
}: {
  title: string;
  description: string;
  alternate: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-[#f7f2e8] lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
      <section className="flex flex-col p-5 sm:p-8 lg:p-12">
        <Brand />
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Secure access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-8 rounded-3xl border border-[#ddd5c8] bg-white p-5 shadow-[0_24px_70px_rgba(50,58,52,0.08)] sm:p-6">{children}</div>
          <p className="mt-5 text-center text-xs text-muted-foreground">{alternate.label} <Link href={alternate.href} className="font-semibold text-primary hover:underline">Switch sign-in</Link></p>
        </div>
      </section>
      <section className="surface-grid relative hidden overflow-hidden bg-[#173a34] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -end-32 -top-32 size-96 rounded-full bg-[#e9bb52]/16 blur-3xl" />
        <div className="relative ms-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65"><ShieldCheck className="size-3.5 text-[#f5c95f]" /> Financial records stay restaurant-scoped</div>
        <div className="relative max-w-xl">
          <p className="text-sm font-medium text-[#f5c95f]">Clarity at closing time</p>
          <h2 className="mt-4 text-5xl leading-[1.02] font-semibold tracking-[-0.055em]">The whole team can see how every rupee was shared.</h2>
          <div className="mt-8 space-y-3 text-sm text-white/60">{["Private, role-based earnings", "Paise-perfect allocations", "Every financial change audited"].map((item) => <p key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#80bba7]" /> {item}</p>)}</div>
        </div>
        <p className="relative text-xs text-white/35">TipSathi · Transparent tips for restaurant teams</p>
      </section>
    </main>
  );
}
