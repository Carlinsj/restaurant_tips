import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ReceiptIndianRupee,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  EmployeeNavigation,
  type EmployeeView,
} from "@/components/employee/employee-navigation";
import { EmployeeReportCharts } from "@/components/employee/employee-report-charts";
import { Brand } from "@/components/shared/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import {
  summarizeShiftReports,
  type EmployeeDashboardData,
  type PersonalShiftReport,
} from "@/lib/employee-reports";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(date: string): string {
  return DATE_FORMATTER.format(new Date(`${date}T00:00:00.000Z`));
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return "—";
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function formatSignedCurrency(amountMinor: number, currency: string): string {
  if (amountMinor === 0) return formatCurrency(0, currency);
  return `${amountMinor > 0 ? "+" : "−"}${formatCurrency(Math.abs(amountMinor), currency)}`;
}

function payoutTone(status: string): string {
  if (status === "Paid") {
    return "border-emerald-300/60 bg-emerald-50 text-emerald-800";
  }
  if (status === "Approved") {
    return "border-primary/20 bg-primary/10 text-primary";
  }
  return "border-amber-300/60 bg-amber-50 text-amber-800";
}

function CurrentShiftCard({
  report,
  currency,
}: {
  report: PersonalShiftReport | null;
  currency: string;
}) {
  if (!report) {
    return (
      <Card className="border-primary/20 bg-primary py-0 text-primary-foreground">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm font-medium">No active shift</p>
          <p className="mt-1 text-xs text-white/60">
            Your earnings history is available below.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary py-0 text-primary-foreground">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-white/60">
              Your tips this shift
            </p>
            <p className="font-tabular mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              {formatCurrency(report.totalPaise, currency)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-200/80">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {report.tipCount} {report.tipCount === 1 ? "tip" : "tips"} across{" "}
              {formatHours(report.minutesWorked)} worked
            </p>
          </div>
          <div className="grid min-w-full grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/5 py-3 sm:min-w-[380px]">
            <div className="px-4">
              <p className="text-[10px] text-white/50">Direct</p>
              <p className="font-tabular mt-1 text-sm font-semibold">
                {formatCurrency(report.directPaise, currency)}
              </p>
            </div>
            <div className="px-4">
              <p className="text-[10px] text-white/50">Pool</p>
              <p className="font-tabular mt-1 text-sm font-semibold">
                {formatCurrency(report.poolPaise, currency)}
              </p>
            </div>
            <div className="px-4">
              <p className="text-[10px] text-white/50">Adjustments</p>
              <p className="font-tabular mt-1 text-sm font-semibold">
                {formatSignedCurrency(report.adjustmentsPaise, currency)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeDashboard({
  data,
  view,
}: {
  data: EmployeeDashboardData;
  view: EmployeeView;
}) {
  const { employee, currentShift } = data;
  const previousShiftReports = data.shiftReports.filter(
    (report) => report.id !== currentShift?.id,
  );
  const visibleReports =
    view === "shifts" ? previousShiftReports : data.shiftReports;
  const summary = summarizeShiftReports(visibleReports);
  const intro = {
    current: {
      eyebrow: currentShift
        ? `${currentShift.name} · ${currentShift.status}`
        : "Personal earnings",
      heading: `Namaste, ${employee.firstName}`,
      copy: "Your tables, tip allocations, and earnings for this shift.",
    },
    shifts: {
      eyebrow: "Personal earnings",
      heading: "Previous shifts",
      copy: "Review what you earned and how each shift was paid.",
    },
    reports: {
      eyebrow: "Personal performance",
      heading: "Your tip reports",
      copy: "See your earnings pattern, tip mix, and recent shift averages.",
    },
  }[view];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Brand inverse />
          <div className="flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <p className="text-xs font-semibold">{employee.name}</p>
              <p className="mt-0.5 text-[10px] text-white/55">
                {employee.role} · {employee.code}
              </p>
            </div>
            <Avatar className="size-8 border border-white/15">
              <AvatarFallback className="bg-amber-300 text-xs font-semibold text-primary">
                {employee.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 sm:py-9">
        <section className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full bg-emerald-600"
                aria-hidden="true"
              />
              <p className="eyebrow">{intro.eyebrow}</p>
            </div>
            <h1 className="page-heading mt-2">{intro.heading}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {intro.copy}
            </p>
          </div>
          <LogoutButton appearance="button" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start">
          <aside>
            <EmployeeNavigation view={view} />
          </aside>
          <div className="min-w-0 space-y-6">
        {view === "current" && (
          <>
        <CurrentShiftCard report={currentShift} currency={data.currency} />

        {data.assignedTables.length > 0 && (
          <section aria-labelledby="assigned-tables-title">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="eyebrow">Floor</p>
                <h2
                  id="assigned-tables-title"
                  className="mt-1 text-base font-semibold"
                >
                  Assigned tables
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {data.assignedTables.length} active
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.assignedTables.map((table) => (
                <Card key={table.id} className="py-4">
                  <CardContent className="px-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          Table
                        </p>
                        <p className="font-tabular mt-1 text-2xl font-semibold">
                          {table.number}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          table.status === "Tip received"
                            ? "border-emerald-300/60 bg-emerald-50 text-emerald-800"
                            : "border-amber-300/60 bg-amber-50 text-amber-800"
                        }
                      >
                        {table.status}
                      </Badge>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {table.billPaise === null
                          ? "No open bill"
                          : `Bill · ${formatCurrency(table.billPaise, data.currency)}`}
                      </p>
                      <p className="text-xs font-semibold text-primary">
                        {table.earnedPaise === null
                          ? "Awaiting tip"
                          : `${formatSignedCurrency(table.earnedPaise, data.currency)} to you`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {data.recentAllocations.length > 0 && (
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle className="text-sm">Recent allocations</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border px-5">
              {data.recentAllocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="flex items-center gap-3 py-3.5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <WalletCards className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">
                      {allocation.tableNumber === null
                        ? "Pooled tip"
                        : `Table ${allocation.tableNumber}`}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {allocation.time}
                      </span>
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {allocation.source} · {allocation.allocationLabel}
                    </p>
                  </div>
                  <strong className="font-tabular text-sm">
                    {formatSignedCurrency(allocation.amountPaise, data.currency)}
                  </strong>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
          </>
        )}

        {view !== "current" && (
        <section aria-labelledby="personal-report-title">
          <div className="mb-3">
            <p className="eyebrow">Personal report</p>
            <h2
              id="personal-report-title"
              className="mt-1 text-base font-semibold"
            >
              Earnings overview
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Recent earnings",
                value: formatCurrency(summary.recentTotalPaise, data.currency),
                detail: `${summary.shiftCount} shifts`,
                icon: ReceiptIndianRupee,
              },
              {
                label: "Average per shift",
                value: formatCurrency(summary.averagePerShiftPaise, data.currency),
                detail: "Across recent shifts",
                icon: TrendingUp,
              },
              {
                label: "Best shift",
                value: formatCurrency(summary.bestShiftPaise, data.currency),
                detail: "Highest recent total",
                icon: CalendarDays,
              },
              {
                label: "Tips received",
                value: String(summary.tipCount),
                detail: "Individual tips",
                icon: WalletCards,
              },
            ].map((metric) => (
              <Card key={metric.label} className="gap-3 py-4">
                <CardContent className="px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="font-tabular mt-2 text-xl font-semibold tracking-[-0.035em]">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {metric.detail}
                      </p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <metric.icon className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        )}

        {view === "shifts" && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border px-5 py-4">
            <div>
              <CardTitle className="text-sm">Earnings by shift</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Direct and pooled tip amounts credited to your account.
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {previousShiftReports.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">
                No tip earnings recorded yet.
              </p>
            ) : (
              <>
                <div className="divide-y divide-border sm:hidden">
                  {previousShiftReports.map((report) => (
                    <article key={report.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold">{report.name}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDate(report.date)} ·{" "}
                            {formatHours(report.minutesWorked)} ·{" "}
                            {report.tipCount} tips
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={payoutTone(report.payoutStatus)}
                        >
                          {report.payoutStatus}
                        </Badge>
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/45 p-3">
                        <div>
                          <dt className="text-[9px] text-muted-foreground">
                            Direct
                          </dt>
                          <dd className="font-tabular mt-1 text-xs font-medium">
                            {formatCurrency(report.directPaise, data.currency)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] text-muted-foreground">
                            Pool
                          </dt>
                          <dd className="font-tabular mt-1 text-xs font-medium">
                            {formatCurrency(report.poolPaise, data.currency)}
                          </dd>
                        </div>
                        <div className="text-end">
                          <dt className="text-[9px] text-muted-foreground">
                            Total
                          </dt>
                          <dd className="font-tabular mt-1 text-xs font-semibold">
                            {formatCurrency(report.totalPaise, data.currency)}
                          </dd>
                        </div>
                      </dl>
                      {report.adjustmentsPaise !== 0 && (
                        <p className="mt-2 text-end text-[10px] text-muted-foreground">
                          Adjustments{" "}
                          {formatSignedCurrency(report.adjustmentsPaise, data.currency)}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="ps-5">Shift</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Tips</TableHead>
                        <TableHead className="text-end">Direct</TableHead>
                        <TableHead className="text-end">Pool</TableHead>
                        <TableHead className="text-end">Adjustments</TableHead>
                        <TableHead className="text-end">Total</TableHead>
                        <TableHead className="pe-5 text-end">Payout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previousShiftReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="ps-5">
                            <p className="text-xs font-semibold">
                              {report.name}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {formatDate(report.date)}
                            </p>
                          </TableCell>
                          <TableCell className="font-tabular text-xs">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3
                                className="size-3 text-muted-foreground"
                                aria-hidden="true"
                              />
                              {formatHours(report.minutesWorked)}
                            </span>
                          </TableCell>
                          <TableCell className="font-tabular text-xs">
                            {report.tipCount}
                          </TableCell>
                          <TableCell className="font-tabular text-end text-xs">
                            {formatCurrency(report.directPaise, data.currency)}
                          </TableCell>
                          <TableCell className="font-tabular text-end text-xs">
                            {formatCurrency(report.poolPaise, data.currency)}
                          </TableCell>
                          <TableCell className="font-tabular text-end text-xs">
                            {formatSignedCurrency(report.adjustmentsPaise, data.currency)}
                          </TableCell>
                          <TableCell className="font-tabular text-end text-xs font-semibold">
                            {formatCurrency(report.totalPaise, data.currency)}
                          </TableCell>
                          <TableCell className="pe-5 text-end">
                            <Badge
                              variant="outline"
                              className={payoutTone(report.payoutStatus)}
                            >
                              {report.payoutStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}

        {view === "reports" && (
          <EmployeeReportCharts
            reports={data.shiftReports}
            currency={data.currency}
          />
        )}
          </div>
        </div>
      </main>
    </div>
  );
}
