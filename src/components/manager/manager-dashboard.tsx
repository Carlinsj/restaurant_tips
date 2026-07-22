"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  IndianRupee,
  Plus,
  QrCode,
  ReceiptIndianRupee,
  Users,
  WalletCards,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demoEmployees, demoShift, demoTables, recentTips } from "@/lib/demo-data";
import { formatInr, parseRupeesToPaise } from "@/lib/currency";

type RecentTip = (typeof recentTips)[number] | {
  table: string;
  time: string;
  amountPaise: number;
  method: "Cash";
  split: string;
};

const statusStyle: Record<string, string> = {
  Open: "border-[#ded8cc] bg-[#f9f6ef] text-[#7b756c]",
  Dining: "border-[#d6e4df] bg-[#e9f2ee] text-[#387462]",
  "Bill ready": "border-[#ead9af] bg-[#f7edd3] text-[#8d6722]",
  "Tip received": "border-[#cce2d4] bg-[#deefe5] text-[#2e745e]",
  Settled: "border-[#e1ddd6] bg-[#eeece7] text-[#7a7771]",
};

export function ManagerDashboard() {
  const [cashTipOpen, setCashTipOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashTable, setCashTable] = useState("6");
  const [addedCashPaise, setAddedCashPaise] = useState(0);
  const [cashTips, setCashTips] = useState<RecentTip[]>([]);
  const [feedback, setFeedback] = useState("");

  const totalTips = demoShift.totalTipsPaise + addedCashPaise;
  const displayedTips = [...cashTips, ...recentTips].slice(0, 5);

  function addCashTip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const amountPaise = parseRupeesToPaise(cashAmount);
      if (amountPaise <= 0) throw new Error("Amount must be positive");
      setAddedCashPaise((current) => current + amountPaise);
      setCashTips((current) => [
        {
          table: `Table ${cashTable}`,
          time: "Just now",
          amountPaise,
          method: "Cash",
          split: "Default 70/30 rule",
        },
        ...current,
      ]);
      setFeedback(`${formatInr(amountPaise)} cash tip added to Table ${cashTable}.`);
      setCashAmount("");
      setCashTipOpen(false);
    } catch {
      setFeedback("Enter a valid cash tip amount.");
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40" /><span className="relative inline-flex size-2 rounded-full bg-emerald-600" /></span>
            <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Live shift</p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Good evening, Demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dinner service is moving smoothly. One item needs your review.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="h-10 border-[#d6cfc2] bg-white/60 shadow-none">
            <Link href="/tip/demo-bill"><QrCode className="size-4" /> Open tip page</Link>
          </Button>
          <Dialog open={cashTipOpen} onOpenChange={setCashTipOpen}>
            <DialogTrigger asChild><Button className="h-10"><Plus className="size-4" /> Add cash tip</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[430px]">
              <form onSubmit={addCashTip}>
                <DialogHeader>
                  <DialogTitle>Add a cash tip</DialogTitle>
                  <DialogDescription>Record it against the table. The active 70/30 allocation rule will be applied.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-5">
                  <div className="grid gap-2"><Label htmlFor="cash-table">Table</Label><Select value={cashTable} onValueChange={setCashTable}><SelectTrigger id="cash-table"><SelectValue /></SelectTrigger><SelectContent>{demoTables.filter((table) => table.status !== "Open").map((table) => <SelectItem key={table.number} value={String(table.number)}>Table {table.number} · {table.staff}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label htmlFor="cash-amount">Tip amount</Label><div className="relative"><IndianRupee className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="cash-amount" inputMode="decimal" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder="500" className="ps-9 font-tabular" autoFocus /></div></div>
                </div>
                <DialogFooter><Button type="button" variant="ghost" onClick={() => setCashTipOpen(false)}>Cancel</Button><Button type="submit">Save cash tip</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {feedback && <div role="status" className="flex items-center gap-2 rounded-xl border border-primary/15 bg-[#e8f2ed] px-4 py-2.5 text-xs text-primary"><CheckCircle2 className="size-4" /> {feedback}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Confirmed tips", value: formatInr(totalTips), detail: "+18% vs last Wed", icon: CircleDollarSign, tone: "bg-[#e4efe9] text-primary" },
          { label: "Average tip", value: `${demoShift.averageTipPercent}%`, detail: "Target 10%", icon: ReceiptIndianRupee, tone: "bg-[#f4e9c9] text-[#956b1f]" },
          { label: "Bills settled", value: `${demoShift.billsPaid} / ${demoShift.billsTotal}`, detail: "11 still open", icon: WalletCards, tone: "bg-[#e5edf3] text-[#426e89]" },
          { label: "Team on duty", value: String(demoShift.employeesOnDuty), detail: "7 floor · 1 break", icon: Users, tone: "bg-[#eee5ef] text-[#77597b]" },
        ].map((metric) => (
          <Card key={metric.label} className="gap-3 border-[#dfd8ca] bg-white/72 py-4 shadow-none">
            <CardContent className="px-4">
              <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><p className="font-tabular mt-2 text-2xl font-semibold tracking-[-0.04em]">{metric.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</p></div><span className={`flex size-9 items-center justify-center rounded-xl ${metric.tone}`}><metric.icon className="size-[17px]" /></span></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Card className="gap-0 border-[#ded7ca] bg-white/74 py-0 shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-[#e8e1d6] px-4 py-4 sm:px-5">
            <div><CardTitle className="text-sm">Live floor</CardTitle><p className="mt-1 text-xs text-muted-foreground">Tap a table to review its bill and team.</p></div>
            <Button size="sm" variant="ghost" asChild className="text-xs"><Link href="/manager/tables">Manage floor <ChevronRight className="size-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-5">
            {demoTables.map((table) => (
              <Link href={`/manager/tables#table-${table.number}`} key={table.number} className="group min-h-[116px] rounded-2xl border border-[#e5ded3] bg-[#fcfaf6] p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm">
                <div className="flex items-start justify-between"><span className="font-tabular text-lg font-semibold">{table.number}</span><span className="text-[10px] text-muted-foreground">{table.seats} seats</span></div>
                <Badge variant="outline" className={`mt-3 h-5 rounded-full px-2 text-[9px] font-medium ${statusStyle[table.status]}`}>{table.status}</Badge>
                <div className="mt-3 flex items-end justify-between"><p className="truncate text-[10px] text-muted-foreground">{table.staff}</p>{table.billPaise > 0 && <p className="font-tabular text-xs font-semibold">{formatInr(table.billPaise)}</p>}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="gap-4 border-[#ded7ca] bg-[#173a34] py-5 text-white shadow-none">
            <CardHeader className="px-5"><div className="flex items-center justify-between"><CardTitle className="text-sm">Shift close readiness</CardTitle><span className="font-tabular text-xs text-[#f3cb69]">86%</span></div></CardHeader>
            <CardContent className="px-5">
              <Progress value={86} className="h-1.5 bg-white/12 [&>div]:bg-[#f3c85e]" />
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/62"><CheckCircle2 className="size-3.5 text-[#8ac0ad]" /> 31 bills settled</span><span className="text-white/80">Done</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/62"><CheckCircle2 className="size-3.5 text-[#8ac0ad]" /> Allocations balanced</span><span className="text-white/80">₹0 left</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/62"><AlertCircle className="size-3.5 text-[#f3c85e]" /> Table 9 missing runner</span><span className="text-[#f3c85e]">Review</span></div>
              </div>
              <Button asChild variant="secondary" className="mt-5 h-9 w-full bg-white text-[#173a34] hover:bg-white/90"><Link href="/manager/shifts/demo">Review this shift <ArrowRight className="size-3.5" /></Link></Button>
            </CardContent>
          </Card>

          <Card className="gap-3 border-[#ded7ca] bg-white/72 py-4 shadow-none">
            <CardHeader className="px-5"><CardTitle className="text-sm">Tip mix</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-5 px-5">
              <div className="relative size-[94px] shrink-0 rounded-full" style={{ background: "conic-gradient(#317c67 0 70%, #e1b24b 70% 100%)" }}><div className="absolute inset-[12px] flex items-center justify-center rounded-full bg-[#fbfaf6]"><span className="text-center text-[10px] text-muted-foreground"><strong className="block text-base text-foreground">70%</strong>digital</span></div></div>
              <div className="min-w-0 flex-1 space-y-3 text-xs"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><i className="size-2 rounded-full bg-primary" /> Digital</span><strong className="font-tabular">{formatInr(demoShift.digitalTipsPaise)}</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><i className="size-2 rounded-full bg-[#d8a947]" /> Cash</span><strong className="font-tabular">{formatInr(demoShift.cashTipsPaise + addedCashPaise)}</strong></div></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="gap-0 border-[#ded7ca] bg-white/74 py-0 shadow-none">
          <CardHeader className="border-b border-[#e8e1d6] px-5 py-4"><div className="flex items-center justify-between"><CardTitle className="text-sm">Recent tips</CardTitle><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" /> Live</span></div></CardHeader>
          <CardContent className="divide-y divide-[#ebe5db] px-5">
            {displayedTips.map((tip, index) => (
              <div key={`${tip.table}-${tip.time}-${index}`} className="flex items-center gap-3 py-3.5"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tip.method === "Cash" ? "bg-[#f7edd4] text-[#997128]" : "bg-[#e4efe9] text-primary"}`}>{tip.method === "Cash" ? <Banknote className="size-4" /> : <IndianRupee className="size-4" />}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{tip.table} <span className="font-normal text-muted-foreground">· {tip.time}</span></p><p className="mt-1 truncate text-[10px] text-muted-foreground">{tip.split}</p></div><strong className="font-tabular text-sm">+{formatInr(tip.amountPaise)}</strong></div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 border-[#ded7ca] bg-white/74 py-0 shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b border-[#e8e1d6] px-5 py-4"><div><CardTitle className="text-sm">Team earnings</CardTitle><p className="mt-1 text-xs text-muted-foreground">Current, before shift finalization</p></div><Button size="sm" variant="ghost" asChild className="text-xs"><Link href="/manager/employees">View team <ChevronRight className="size-3.5" /></Link></Button></CardHeader>
          <CardContent className="divide-y divide-[#ebe5db] px-5">
            {demoEmployees.slice(0, 5).map((employee) => (
              <div key={employee.code} className="flex items-center gap-3 py-3"><Avatar className="size-8"><AvatarFallback className="bg-[#e5eee9] text-[10px] font-semibold text-primary">{employee.initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{employee.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{employee.role} · Tables {employee.tables}</p></div><strong className="font-tabular text-sm">{formatInr(employee.tipsPaise)}</strong></div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
