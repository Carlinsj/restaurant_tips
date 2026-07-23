import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Check,
  CircleCheck,
  QrCode,
  Users,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const chartBars = [38, 54, 42, 74, 61, 92, 81, 100];

const features = [
  {
    icon: QrCode,
    number: "01",
    title: "Tips tied to the bill",
    copy: "A private QR link connects the customer’s choice to the correct bill, table, shift, and serving team.",
  },
  {
    icon: Users,
    number: "02",
    title: "Rules the team can trust",
    copy: "Weighted and equal splits run in paise, with deterministic rounding and a visible record for every employee.",
  },
  {
    icon: BadgeIndianRupee,
    number: "03",
    title: "A calmer shift close",
    copy: "Managers can review exceptions, understand allocations, and see the intended payout workflow in one place.",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/95">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav className="flex items-center gap-1" aria-label="Account navigation">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/employee-login">Staff sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Manager login</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="surface-grid relative overflow-hidden border-b border-border/70">
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.035] to-transparent" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.98fr_1.02fr] lg:py-28">
            <div className="max-w-2xl">
              <h1 className="text-[46px] leading-[0.98] font-semibold tracking-[-0.06em] text-foreground sm:text-[68px] lg:text-[76px]">
                Every tip.{" "}
                <span className="mt-1 block text-primary">Shared clearly.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                TipSathi connects each customer tip to the bill, shift, and people behind the service—so the team can understand exactly how earnings were shared.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/manager">
                    Explore manager demo <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/tip/demo-bill">
                    <QrCode className="size-4" /> Try customer flow
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
                {["Paise-accurate", "Auditable allocations", "No customer account"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-[590px] lg:ms-auto">
              <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-[0_24px_70px_rgba(28,52,44,0.11)]">
                <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Dinner service · Demo preview</p>
                    <p className="mt-1 text-sm font-semibold">Saffron & Slate</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" /> 8 on duty
                  </span>
                </div>

                <CardContent className="grid gap-4 p-4 sm:grid-cols-[1.08fr_0.92fr] sm:p-5">
                  <div className="rounded-xl bg-[#183f37] p-5 text-white">
                    <p className="text-xs text-white/55">Confirmed tips</p>
                    <p className="font-tabular mt-2 text-3xl font-semibold tracking-[-0.05em]">₹12,480</p>
                    <p className="mt-1 text-xs text-white/60">18% above last Wednesday</p>
                    <div className="mt-7 flex h-20 items-end gap-2" aria-hidden="true">
                      {chartBars.map((height, index) => (
                        <span
                          key={height}
                          className="flex-1 rounded-t-sm bg-[#e5bc54]"
                          style={{ height: `${height}%`, opacity: 0.45 + index * 0.06 }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-xl border border-border bg-muted/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Table 6</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-primary uppercase">
                          Allocated
                        </span>
                      </div>
                      <p className="font-tabular mt-4 text-xl font-semibold">₹200</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Arjun 70% · Priya 30%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/35 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CircleCheck className="size-4 text-primary" aria-hidden="true" /> Shift readiness
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="font-tabular text-xl font-semibold">31 / 42</p>
                        <p className="text-[10px] text-muted-foreground">bills settled</p>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                        <div className="h-full w-[74%] rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>
                </CardContent>

                <div className="grid grid-cols-3 border-t border-border bg-muted/25 px-2 py-4 text-center">
                  {[
                    ["Avg. tip", "11.8%"],
                    ["Digital", "₹8,700"],
                    ["Cash", "₹3,780"],
                  ].map(([label, value], index) => (
                    <div key={label} className={index > 0 ? "border-s border-border" : undefined}>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="font-tabular mt-1 text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">One connected workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Clear for customers, managers, and staff.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Each view focuses on the decision that person needs to make—without exposing unnecessary restaurant data.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="relative min-h-64 p-1">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">{feature.number}</span>
                  </div>
                  <div className="mt-auto pt-10">
                    <h3 className="text-base font-semibold tracking-[-0.02em]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Brand compact />
          <p>Transparent tipping for the people behind great service.</p>
        </div>
      </footer>
    </div>
  );
}
