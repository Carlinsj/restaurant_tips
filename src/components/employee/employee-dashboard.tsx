import { CheckCircle2, Clock3, WalletCards } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/shared/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/currency";

const assignedTables = [
  { number: 3, status: "Bill ready", guests: 4, bill: "₹2,450", lastTip: "Awaiting tip" },
  { number: 6, status: "Tip received", guests: 4, bill: "₹2,000", lastTip: "+₹140 to you" },
] as const;

const recentAllocations = [
  { table: 6, time: "9:42 PM", source: "POS import", amount: 14_000 },
  { table: 1, time: "9:18 PM", source: "Digital", amount: 12_600 },
  { table: 8, time: "8:54 PM", source: "Cash", amount: 8_750 },
] as const;

export function EmployeeDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Brand inverse />
          <div className="flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <p className="text-xs font-semibold">Arjun Mehta</p>
              <p className="mt-0.5 text-[10px] text-white/55">Demo account</p>
            </div>
            <Avatar className="size-8 border border-white/15">
              <AvatarFallback className="bg-amber-300 text-xs font-semibold text-primary">AM</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6 sm:py-9">
        <section className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
              <p className="eyebrow">Demo shift · read only</p>
            </div>
            <h1 className="page-heading mt-2">Namaste, Arjun</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Your assignments and earnings for tonight’s service.</p>
          </div>
          <LogoutButton appearance="button" />
        </section>

        <Card className="overflow-hidden border-primary/20 bg-primary py-0 text-primary-foreground">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium text-white/60">Your tips this shift</p>
                <p className="font-tabular mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                  {formatInr(184_000)}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-200/80">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  All 8 allocations are balanced
                </p>
              </div>
              <div className="grid min-w-full grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/5 py-3 sm:min-w-[360px]">
                <div className="px-4">
                  <p className="text-[10px] text-white/50">Direct</p>
                  <p className="font-tabular mt-1 text-sm font-semibold">₹1,288</p>
                </div>
                <div className="px-4">
                  <p className="text-[10px] text-white/50">Pool</p>
                  <p className="font-tabular mt-1 text-sm font-semibold">₹552</p>
                </div>
                <div className="px-4">
                  <p className="text-[10px] text-white/50">Pending</p>
                  <p className="font-tabular mt-1 text-sm font-semibold">₹0</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="assigned-tables-title">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="eyebrow">Floor</p>
              <h2 id="assigned-tables-title" className="mt-1 text-base font-semibold">Assigned tables</h2>
            </div>
            <span className="text-xs text-muted-foreground">2 active</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {assignedTables.map((table) => (
              <Card key={table.number} className="py-4">
                <CardContent className="px-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Table</p>
                      <p className="font-tabular mt-1 text-2xl font-semibold">{table.number}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={table.status === "Tip received"
                        ? "border-emerald-300/60 bg-emerald-50 text-emerald-800"
                        : "border-amber-300/60 bg-amber-50 text-amber-800"}
                    >
                      {table.status}
                    </Badge>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{table.guests} guests · {table.bill}</p>
                    <p className="text-xs font-semibold text-primary">{table.lastTip}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent allocations</CardTitle>
              <span className="text-[10px] text-muted-foreground">70% direct share</span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border px-5">
            {recentAllocations.map((tip) => (
              <div key={`${tip.table}-${tip.time}`} className="flex items-center gap-3 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <WalletCards className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Table {tip.table} <span className="font-normal text-muted-foreground">· {tip.time}</span></p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{tip.source} · 70% share</p>
                </div>
                <strong className="font-tabular text-sm">+{formatInr(tip.amount)}</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-300/50 bg-amber-50 py-4 shadow-none">
          <CardContent className="flex items-center gap-3 px-4">
            <Clock3 className="size-5 text-amber-700" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-xs font-semibold">Example payout after approval</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Your finalized shift amount will appear here.</p>
            </div>
            <strong className="font-tabular text-sm">₹1,840</strong>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
