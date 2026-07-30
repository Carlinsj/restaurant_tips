import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  IndianRupee,
  QrCode,
  ReceiptIndianRupee,
  Users,
  WalletCards,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ManagerDashboardData } from "@/lib/demo-data";
import { formatInr } from "@/lib/currency";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  Open: "border-border bg-background text-muted-foreground",
  Dining: "border-primary/15 bg-primary/8 text-primary",
  "Bill ready": "border-amber-300/60 bg-amber-50 text-amber-800",
  "Tip received": "border-emerald-300/60 bg-emerald-50 text-emerald-800",
  Settled: "border-border bg-muted text-muted-foreground",
};

export function ManagerDashboard({ data }: { data: ManagerDashboardData }) {
  const totalTips = data.shift.totalTipsPaise;
  const displayedTips = data.recentTips.slice(0, 5);
  const digitalPercent =
    totalTips > 0
      ? Math.round((data.shift.digitalTipsPaise * 100) / totalTips)
      : 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
            <p className="eyebrow">Open shift</p>
          </div>
          <h1 className="page-heading mt-2">Dinner service</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Dinner service is moving smoothly. One item needs your review.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/tip/demo-bill"><QrCode className="size-4" aria-hidden="true" /> Open tip page</Link>
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Confirmed tips", value: formatInr(totalTips), detail: "+18% vs last Wed", icon: CircleDollarSign },
          { label: "Average tip", value: `${data.shift.averageTipPercent}%`, detail: "Target 10%", icon: ReceiptIndianRupee },
          { label: "Bills settled", value: `${data.shift.billsPaid} / ${data.shift.billsTotal}`, detail: "11 still open", icon: WalletCards },
          { label: "Team on duty", value: String(data.shift.employeesOnDuty), detail: "7 floor · 1 break", icon: Users },
        ].map((metric) => (
          <Card key={metric.label} className="gap-3 py-4">
            <CardContent className="px-4">
              <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><p className="font-tabular mt-2 text-2xl font-semibold tracking-[-0.04em]">{metric.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</p></div><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><metric.icon className="size-[17px]" aria-hidden="true" /></span></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Card className="gap-0 py-0">
          <CardHeader className="flex-row items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div><CardTitle className="text-sm">Floor status</CardTitle><p className="mt-1 text-xs text-muted-foreground">Select a table to open its floor summary.</p></div>
            <Button size="sm" variant="ghost" asChild className="text-xs"><Link href="/manager/tables">Manage floor <ChevronRight className="size-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-5">
            {data.tables.map((table) => (
              <Link href={`/manager/tables#table-${table.number}`} key={table.number} className="group min-h-[116px] rounded-lg border border-border bg-muted/25 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5">
                <div className="flex items-start justify-between"><span className="font-tabular text-lg font-semibold">{table.number}</span><span className="text-[10px] text-muted-foreground">{table.seats} seats</span></div>
                <Badge variant="outline" className={`mt-3 h-5 rounded-full px-2 text-[9px] font-medium ${statusStyle[table.status]}`}>{table.status}</Badge>
                <div className="mt-3 flex items-end justify-between"><p className="truncate text-[10px] text-muted-foreground">{table.staff}</p>{table.billPaise > 0 && <p className="font-tabular text-xs font-semibold">{formatInr(table.billPaise)}</p>}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="gap-4 border-primary/20 bg-primary py-5 text-primary-foreground">
            <CardHeader className="px-5"><div className="flex items-center justify-between"><CardTitle className="text-sm">Shift close readiness</CardTitle><span className="font-tabular text-xs text-[#f3cb69]">86%</span></div></CardHeader>
            <CardContent className="px-5">
              <Progress value={86} className="h-1.5 bg-white/15 [&>div]:bg-amber-300" />
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/62"><CheckCircle2 className="size-3.5 text-[#8ac0ad]" /> 31 bills settled</span><span className="text-white/80">Done</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/62"><CheckCircle2 className="size-3.5 text-[#8ac0ad]" /> Allocations balanced</span><span className="text-white/80">₹0 left</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/62"><AlertCircle className="size-3.5 text-[#f3c85e]" /> Table 9 missing runner</span><span className="text-[#f3c85e]">Review</span></div>
              </div>
              <Button asChild variant="secondary" className="mt-5 w-full bg-white text-primary hover:bg-white/90"><Link href="/manager/shifts/demo">Review this shift <ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-5"><CardTitle className="text-sm">Tip mix</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-5 px-5">
              <div className="relative size-[94px] shrink-0 rounded-full" style={{ background: `conic-gradient(var(--primary) 0 ${digitalPercent}%, #d6a940 ${digitalPercent}% 100%)` }}><div className="absolute inset-[12px] flex items-center justify-center rounded-full bg-card"><span className="text-center text-[10px] text-muted-foreground"><strong className="block text-base text-foreground">{digitalPercent}%</strong>digital</span></div></div>
              <div className="min-w-0 flex-1 space-y-3 text-xs"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-primary" aria-hidden="true" /> Digital</span><strong className="font-tabular">{formatInr(data.shift.digitalTipsPaise)}</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-amber-500" aria-hidden="true" /> Cash</span><strong className="font-tabular">{formatInr(data.shift.cashTipsPaise)}</strong></div></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border px-5 py-4"><CardTitle className="text-sm">Recent tips</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border px-5">
            {displayedTips.map((tip) => (
              <div key={tip.id} className="flex items-center gap-3 py-3.5"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tip.method === "Cash" ? "bg-amber-50 text-amber-800" : "bg-primary/10 text-primary")}>{tip.method === "Cash" ? <Banknote className="size-4" aria-hidden="true" /> : <IndianRupee className="size-4" aria-hidden="true" />}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{tip.table} <span className="font-normal text-muted-foreground">· {tip.time}</span></p><p className="mt-1 truncate text-[10px] text-muted-foreground">{tip.split}</p></div><strong className="font-tabular text-sm">+{formatInr(tip.amountPaise)}</strong></div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4"><div><CardTitle className="text-sm">Team earnings</CardTitle><p className="mt-1 text-xs text-muted-foreground">Current, before shift finalization</p></div><Button size="sm" variant="ghost" asChild className="text-xs"><Link href="/manager/employees">View team <ChevronRight className="size-3.5" aria-hidden="true" /></Link></Button></CardHeader>
          <CardContent className="divide-y divide-border px-5">
            {data.employees.slice(0, 5).map((employee) => (
              <div key={employee.code} className="flex items-center gap-3 py-3"><Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{employee.initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{employee.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{employee.role} · Tables {employee.tables}</p></div><strong className="font-tabular text-sm">{formatInr(employee.tipsPaise)}</strong></div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
