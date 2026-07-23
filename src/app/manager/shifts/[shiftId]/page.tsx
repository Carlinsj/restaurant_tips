import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/currency";
import { demoEmployees } from "@/lib/demo-data";

export default async function ShiftReviewPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  await params;

  const metrics = [
    { label: "Confirmed tips", value: "₹12,480", icon: WalletCards },
    { label: "Bills settled", value: "31 / 42", icon: ReceiptText },
    { label: "Employees", value: "8", icon: Users },
  ];

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ms-2">
        <Link href="/manager">
          <ArrowLeft className="size-3.5" /> Overview
        </Link>
      </Button>

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#e8d2aa] bg-[#f7ecd5] text-[#966b20]">
              Demo review
            </Badge>
            <span className="text-xs text-muted-foreground">22 July 2026</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">
            Dinner service
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only example of the review step before employee earnings are locked.
          </p>
        </div>
      </section>

      <Alert className="border-[#ead4af] bg-[#faf0dd]">
        <AlertTriangle className="size-4 text-[#a7682f]" />
        <AlertTitle>One assignment needs review</AlertTitle>
        <AlertDescription>
          A live finalization workflow must resolve Table 9&apos;s missing runner assignment before closing.
        </AlertDescription>
      </Alert>

      <section className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="gap-2 border-[#dfd8ca] bg-white/72 py-4 shadow-none">
            <CardContent className="flex items-start justify-between px-4">
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="font-tabular mt-2 text-2xl font-semibold">{metric.value}</p>
              </div>
              <metric.icon className="size-4 text-primary" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 border-[#ded7ca] bg-white/76 py-0 shadow-none">
        <CardHeader className="border-b border-[#e8e1d6] px-5 py-4">
          <CardTitle className="text-sm">Example employee allocations</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[#ebe5db] px-5">
          {demoEmployees.map((employee) => (
            <div key={employee.code} className="flex items-center gap-3 py-3">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-semibold">{employee.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {employee.role} · {employee.code}
                </p>
              </div>
              <strong className="font-tabular text-sm">{formatInr(employee.tipsPaise)}</strong>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
