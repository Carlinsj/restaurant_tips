import Link from "next/link";
import { QrCode, TableProperties, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatInr } from "@/lib/currency";
import { demoTables } from "@/lib/demo-data";

export default function TablesPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Floor preview</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">
            Tables & assignments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only sample of each table, bill state, and serving team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Demo data</Badge>
          <Button variant="outline" asChild className="bg-white/65">
            <Link href="/tip/demo-bill">
              <QrCode className="size-4" /> Tip page
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {demoTables.map((table) => (
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

      <Card className="border-[#ded7ca] bg-[#173a34] py-5 text-white shadow-none">
        <CardContent className="flex flex-col justify-between gap-4 px-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#f5c95f]">
              <TableProperties className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Table 9 needs a runner</p>
              <p className="mt-1 text-xs text-white/55">
                Assignment editing is not connected in this prototype.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-white/20 bg-white/10 text-white">
            Read only
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
