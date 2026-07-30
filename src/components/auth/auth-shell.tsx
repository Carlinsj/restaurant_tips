import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
      <section className="flex flex-col p-5 sm:p-8 lg:p-10 xl:p-12">
        <Brand />
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <p className="eyebrow">Secure access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
          <Card className="mt-8 py-0">
            <CardContent className="p-5 sm:p-6">{children}</CardContent>
          </Card>
          <p className="mt-5 text-center text-xs text-muted-foreground">{alternate.label} <Link href={alternate.href} className="font-semibold text-primary hover:underline">Switch sign-in</Link></p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,transparent_40%,rgba(255,255,255,0.05))]" aria-hidden="true" />
        <div className="relative ms-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65"><ShieldCheck className="size-3.5 text-amber-300" aria-hidden="true" /> Financial records stay restaurant-scoped</div>
        <div className="relative max-w-xl">
          <p className="text-sm font-medium text-amber-300">Clarity at closing time</p>
          <h2 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-[-0.05em] xl:text-5xl">The whole team can see how every tip was shared.</h2>
          <div className="mt-8 grid gap-3 text-sm text-white/65">{["Private, role-based earnings", "Exact currency allocation", "Every financial change audited"].map((item) => <p key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-200/80" aria-hidden="true" /> {item}</p>)}</div>
        </div>
        <p className="relative text-xs text-white/35">TipSathi · Transparent tips for restaurant teams</p>
      </section>
    </main>
  );
}
