import { CheckCircle2, Clock3, WalletCards } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoEmployees } from "@/lib/demo-data";
import { formatInr } from "@/lib/currency";

export default function PayoutsPage() {
  const metrics = [
    { label: "Pending payout", value: "₹10,590", icon: Clock3 },
    { label: "Paid this week", value: "₹48,720", icon: CheckCircle2 },
    { label: "Employees pending", value: "8", icon: WalletCards },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Money movement</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Payouts</h1>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="gap-2 border-[#dfd8ca] bg-white/72 py-4 shadow-none">
            <CardContent className="flex items-start justify-between px-4">
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="font-tabular mt-2 text-2xl font-semibold">{metric.value}</p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#e4efe9] text-primary"><metric.icon className="size-[17px]" /></span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 border-[#ded7ca] bg-white/76 py-0 shadow-none">
        <CardHeader className="border-b border-[#e8e1d6] px-5 py-4"><CardTitle className="text-sm">Dinner service · Pending</CardTitle></CardHeader>
        <CardContent className="divide-y divide-[#ebe5db] px-5">
          {demoEmployees.slice(0, 6).map((employee) => (
            <div key={employee.code} className="flex items-center gap-3 py-3.5">
              <Avatar className="size-8"><AvatarFallback className="bg-[#e5eee9] text-[10px] font-semibold text-primary">{employee.initials}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{employee.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Awaiting shift approval</p>
              </div>
              <Badge variant="outline">Pending</Badge>
              <strong className="font-tabular w-20 text-end text-sm">{formatInr(employee.tipsPaise)}</strong>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
