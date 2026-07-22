import { Download, IndianRupee, LineChart, ReceiptText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  const bars = [
    { day: "Mon", height: 58, amount: "₹6,844" },
    { day: "Tue", height: 72, amount: "₹8,496" },
    { day: "Wed", height: 65, amount: "₹7,670" },
    { day: "Thu", height: 84, amount: "₹9,912" },
    { day: "Fri", height: 77, amount: "₹9,086" },
    { day: "Sat", height: 92, amount: "₹10,856" },
    { day: "Sun", height: 88, amount: "₹10,384" },
  ];
  return <div className="space-y-5 sm:space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Performance</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Reports</h1><p className="mt-1 text-sm text-muted-foreground">Tip trends and shift totals, ready for CSV export.</p></div><Button variant="outline" className="bg-white/65"><Download className="size-4" /> Export CSV</Button></section><section className="grid gap-3 sm:grid-cols-3">{[{ label: "Tips this week", value: "₹62,840", copy: "+12.4% from last week", icon: IndianRupee }, { label: "Average tip", value: "11.6%", copy: "+0.8 points", icon: TrendingUp }, { label: "Bills with tips", value: "78%", copy: "214 of 274 bills", icon: ReceiptText }].map((metric) => <Card key={metric.label} className="gap-2 border-[#dfd8ca] bg-white/72 py-4 shadow-none"><CardContent className="flex items-start justify-between px-4"><div><p className="text-xs text-muted-foreground">{metric.label}</p><p className="font-tabular mt-2 text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{metric.copy}</p></div><span className="flex size-9 items-center justify-center rounded-xl bg-[#e4efe9] text-primary"><metric.icon className="size-[17px]" /></span></CardContent></Card>)}</section><Card className="gap-5 border-[#ded7ca] bg-white/76 py-5 shadow-none"><CardHeader className="flex-row items-center justify-between px-5"><div><CardTitle className="text-sm">Daily confirmed tips</CardTitle><p className="mt-1 text-xs text-muted-foreground">Monday–Sunday · Current week</p></div><LineChart className="size-4 text-primary" /></CardHeader><CardContent className="px-5"><div className="flex h-60 items-end gap-3">{bars.map((bar) => <div key={bar.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="font-tabular text-[9px] text-muted-foreground">{bar.amount}</span><div className="w-full max-w-16 rounded-t-lg bg-primary/85" style={{ height: `${bar.height}%` }} /><span className="text-[10px] text-muted-foreground">{bar.day}</span></div>)}</div></CardContent></Card></div>;
}
