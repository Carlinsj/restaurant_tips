import Link from "next/link";
import { QrCode, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatInr } from "@/lib/currency";
import { getManagerDashboardData } from "@/server/manager-dashboard";

function allocationPercentage(amountPaise: number, totalPaise: number): string {
  if (totalPaise <= 0) return "0%";
  const percentage = (amountPaise * 100) / totalPaise;
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(percentage)}%`;
}

export default async function TablesPage() {
  const { tables } = await getManagerDashboardData();
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Floor</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">
            Tables & assignments
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="bg-white/65">
            <Link href="/tip/demo-bill">
              <QrCode className="size-4" /> Tip page
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tables.map((table) => (
          <Card
            id={`table-${table.number}`}
            key={table.number}
            className="gap-3 border-[#ded7ca] bg-white/76 py-4 shadow-none"
          >
            <CardContent className="px-4">
              <div className="flex items-start justify-between">
                <span className="font-tabular flex size-9 items-center justify-center rounded-xl bg-[#173a34] text-sm font-semibold text-white">
                  {table.number}
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {table.status}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-[10px] text-muted-foreground">Primary staff</p>
                <p className="mt-1 text-xs font-semibold">{table.staff}</p>
              </div>
              {table.tipAllocations.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#cfe2d9] bg-[#edf5f1] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-semibold tracking-[0.08em] text-primary uppercase">
                      Workload-balanced
                    </p>
                    <strong className="font-tabular text-[10px] text-primary">
                      {formatInr(table.tipPaise)}
                    </strong>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {table.tipAllocations.map((allocation) => (
                      <span
                        key={allocation.name}
                        className="text-[10px] text-foreground"
                      >
                        {allocation.name}{" "}
                        <strong className="font-tabular">
                          {formatInr(allocation.amountPaise)}
                        </strong>
                        <span className="text-muted-foreground">
                          {" "}· {allocationPercentage(
                            allocation.amountPaise,
                            table.tipPaise,
                          )}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-end justify-between">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Users className="size-3" aria-hidden="true" /> {table.seats} seats
                </span>
                <strong className="font-tabular text-xs">
                  {table.billPaise ? formatInr(table.billPaise) : "—"}
                </strong>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

    </div>
  );
}
