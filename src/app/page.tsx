import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Check,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f2e8]">
      <header className="relative z-20 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/employee-login">Staff sign in</Link>
          </Button>
          <Button asChild className="rounded-full px-5 shadow-sm">
            <Link href="/login">Manager login</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="surface-grid relative border-y border-[#e6dece]">
          <div className="absolute -end-40 -top-48 size-[560px] rounded-full bg-[#e5ba52]/12 blur-3xl" />
          <div className="absolute -start-52 bottom-[-260px] size-[560px] rounded-full bg-[#438774]/12 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:py-28">
            <div>
              <Badge variant="outline" className="rounded-full border-primary/20 bg-white/60 px-3 py-1 text-primary">
                <Sparkles className="me-1 size-3.5" /> Built for Indian restaurant teams
              </Badge>
              <h1 className="mt-6 max-w-[680px] text-[44px] leading-[0.98] font-semibold tracking-[-0.055em] text-[#163c35] sm:text-[66px] lg:text-[76px]">
                Every tip,
                <span className="block text-[#bd7b21]">shared fairly.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#4d625d] sm:text-lg sm:leading-8">
                TipSathi connects every customer tip to the table, shift, and team behind the service—so closing time feels clear, not complicated.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="h-12 rounded-full px-6 text-sm shadow-[0_10px_28px_rgba(34,105,88,0.18)]">
                  <Link href="/manager">Explore manager demo <ArrowRight className="ms-1 size-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 rounded-full border-[#d6cdbd] bg-white/55 px-6 text-sm">
                  <Link href="/tip/demo-bill"><QrCode className="me-1 size-4" /> Try customer flow</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#60736e]">
                {["Money stored in paise", "Auditable allocations", "No customer account"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> {item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[570px] lg:ms-auto">
              <div className="absolute -inset-5 rotate-2 rounded-[36px] border border-[#d9d0bf] bg-[#eadfc9]/45" />
              <div className="relative overflow-hidden rounded-[28px] border border-[#d8d0c1] bg-white shadow-[0_32px_90px_rgba(48,61,55,0.16)]">
                <div className="flex items-center justify-between border-b border-[#e9e3d9] px-5 py-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Dinner service · Live</p>
                    <p className="mt-1 text-sm font-semibold text-[#173a34]">Saffron & Slate</p>
                  </div>
                  <span className="flex items-center gap-2 rounded-full bg-[#e4f1e9] px-3 py-1.5 text-xs font-medium text-[#2b725e]"><span className="size-1.5 rounded-full bg-[#3e9478]" /> 8 on duty</span>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl bg-[#173a34] p-5 text-white">
                    <p className="text-xs text-white/55">Confirmed tips</p>
                    <p className="font-tabular mt-2 text-3xl font-semibold tracking-[-0.05em]">₹12,480</p>
                    <p className="mt-1 text-xs text-[#a6c9bf]">+18% from last Wednesday</p>
                    <div className="mt-6 flex h-20 items-end gap-2" aria-hidden="true">
                      {[38, 54, 42, 74, 61, 92, 81, 100].map((height, index) => <span key={index} className="flex-1 rounded-t-md bg-[#f5c95c]" style={{ height: `${height}%`, opacity: 0.42 + index * 0.06 }} />)}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#ece5d9] bg-[#fbf9f4] p-4">
                      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Table 6</span><span className="rounded-full bg-[#dff0e7] px-2 py-1 text-[10px] font-semibold text-primary">ALLOCATED</span></div>
                      <p className="font-tabular mt-3 text-xl font-semibold">₹200</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Arjun 70% · Priya 30%</p>
                    </div>
                    <div className="rounded-2xl border border-[#ece5d9] bg-[#fbf9f4] p-4">
                      <p className="text-xs text-muted-foreground">Ready to close</p>
                      <div className="mt-3 flex items-end justify-between"><p className="font-tabular text-xl font-semibold">31 / 42</p><p className="text-[10px] text-muted-foreground">bills settled</p></div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7e1d7]"><div className="h-full w-[74%] rounded-full bg-[#d6a43e]" /></div>
                    </div>
                  </div>
                </div>
                <div className="mx-5 mb-5 grid grid-cols-3 divide-x divide-[#e5dfd4] rounded-2xl border border-[#e8e2d7] bg-[#f8f5ee] py-3 text-center">
                  <div><p className="text-[10px] text-muted-foreground">Avg. tip</p><p className="font-tabular mt-1 text-sm font-semibold">11.8%</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Digital</p><p className="font-tabular mt-1 text-sm font-semibold">₹8,700</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Cash</p><p className="font-tabular mt-1 text-sm font-semibold">₹3,780</p></div>
                </div>
              </div>
              <div className="absolute -bottom-6 -start-5 hidden rounded-2xl border border-[#dcd4c6] bg-white p-3 shadow-xl sm:flex sm:items-center sm:gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef5f1] text-primary"><ShieldCheck className="size-4" /></span>
                <div><p className="text-[11px] font-semibold">Shift math checks out</p><p className="text-[10px] text-muted-foreground">₹0 left unallocated</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: QrCode, title: "Tips tied to the table", copy: "A secure QR link connects the bill, table, shift, and serving team without exposing internal IDs." },
              { icon: Users, title: "Rules your team can trust", copy: "Weighted and equal splits run in paise, with deterministic rounding and a clear record for every employee." },
              { icon: BadgeIndianRupee, title: "Close the shift cleanly", copy: "Review cash and digital tips, fix exceptions, finalize earnings, record payouts, and export the report." },
            ].map((feature) => (
              <article key={feature.title} className="rounded-3xl border border-[#e0d8c9] bg-white/65 p-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e4eee9] text-primary"><feature.icon className="size-5" /></span>
                <h2 className="mt-5 text-lg font-semibold tracking-[-0.025em] text-[#173a34]">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e2dbcf] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Brand compact />
          <p>Transparent tipping for the people behind great service.</p>
        </div>
      </footer>
    </div>
  );
}
