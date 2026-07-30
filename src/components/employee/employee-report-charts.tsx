import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import type { PersonalShiftReport } from "@/lib/employee-reports";

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function formatShortDate(date: string): string {
  return SHORT_DATE_FORMATTER.format(new Date(`${date}T00:00:00.000Z`));
}

function totalFor(
  reports: PersonalShiftReport[],
  field: "directPaise" | "poolPaise" | "totalPaise" | "minutesWorked",
): number {
  return reports.reduce((sum, report) => sum + report[field], 0);
}

function EarningsTrend({
  reports,
  currency,
}: {
  reports: PersonalShiftReport[];
  currency: string;
}) {
  const chronologicalReports = [...reports].reverse().slice(-8);
  const maximum = Math.max(
    1,
    ...chronologicalReports.map((report) => report.totalPaise),
  );

  return (
    <Card className="gap-0 py-0 xl:col-span-2">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-sm">Earnings trend</CardTitle>
        <p className="text-xs text-muted-foreground">
          Total tips credited to you after each shift.
        </p>
      </CardHeader>
      <CardContent className="p-5">
        {chronologicalReports.length === 0 ? (
          <p className="py-14 text-center text-sm text-muted-foreground">
            No shift earnings recorded yet.
          </p>
        ) : (
          <>
            <div
              className="flex h-64 items-end gap-2 border-b border-border sm:gap-4"
              role="img"
              aria-label="Bar chart of personal tip earnings by shift"
            >
              {chronologicalReports.map((report) => {
                const totalHeight = Math.max(
                  8,
                  Math.round((report.totalPaise / maximum) * 82),
                );
                const directHeight =
                  report.totalPaise > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          (report.directPaise / report.totalPaise) * 100,
                        ),
                      )
                    : 0;

                return (
                  <div
                    key={report.id}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <span className="font-tabular mb-2 hidden text-[9px] font-medium text-muted-foreground sm:block">
                      {formatCurrency(report.totalPaise, currency)}
                    </span>
                    <div
                      className="flex w-full max-w-14 flex-col-reverse overflow-hidden rounded-t-md bg-amber-300"
                      style={{ height: `${totalHeight}%` }}
                      title={`${formatShortDate(report.date)}: ${formatCurrency(report.totalPaise, currency)}`}
                    >
                      <span
                        className="block w-full bg-primary"
                        style={{ height: `${directHeight}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="mt-2 text-[9px] text-muted-foreground">
                      {formatShortDate(report.date)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
                Direct tips
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-2 rounded-full bg-amber-300"
                  aria-hidden="true"
                />
                Pooled tips
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TipMix({
  reports,
  currency,
}: {
  reports: PersonalShiftReport[];
  currency: string;
}) {
  const directPaise = totalFor(reports, "directPaise");
  const poolPaise = totalFor(reports, "poolPaise");
  const combinedPaise = directPaise + poolPaise;
  const directPercent =
    combinedPaise > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((directPaise / combinedPaise) * 100)),
        )
      : 0;
  const poolPercent = combinedPaise > 0 ? 100 - directPercent : 0;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-sm">How your tips were shared</CardTitle>
        <p className="text-xs text-muted-foreground">
          Direct earnings compared with the staff pool.
        </p>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col">
          <div
            className="relative size-40 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(var(--primary) 0 ${directPercent}%, #e5bc54 ${directPercent}% 100%)`,
            }}
            role="img"
            aria-label={`${directPercent}% direct tips and ${poolPercent}% pooled tips`}
          >
            <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card">
              <strong className="font-tabular text-2xl">{directPercent}%</strong>
              <span className="mt-1 text-[10px] text-muted-foreground">
                direct
              </span>
            </div>
          </div>
          <dl className="w-full space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/45 px-3 py-2.5">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="size-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
                Direct
              </dt>
              <dd className="font-tabular text-xs font-semibold">
                {formatCurrency(directPaise, currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/45 px-3 py-2.5">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="size-2 rounded-full bg-amber-300"
                  aria-hidden="true"
                />
                Pool
              </dt>
              <dd className="font-tabular text-xs font-semibold">
                {formatCurrency(poolPaise, currency)}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function EarningsPace({
  reports,
  currency,
}: {
  reports: PersonalShiftReport[];
  currency: string;
}) {
  const totalPaise = totalFor(reports, "totalPaise");
  const totalMinutes = totalFor(reports, "minutesWorked");
  const totalTipCount = reports.reduce(
    (sum, report) => sum + report.tipCount,
    0,
  );
  const hourlyPaise =
    totalMinutes > 0 ? Math.round((totalPaise * 60) / totalMinutes) : 0;
  const averageTips =
    reports.length > 0 ? Math.round(totalTipCount / reports.length) : 0;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-sm">Shift pace</CardTitle>
        <p className="text-xs text-muted-foreground">
          Personal averages across recent shifts.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 sm:grid-cols-3 xl:grid-cols-1">
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-[10px] text-muted-foreground">Tips per hour</p>
          <p className="font-tabular mt-1 text-lg font-semibold">
            {formatCurrency(hourlyPaise, currency)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-[10px] text-muted-foreground">Tips per shift</p>
          <p className="font-tabular mt-1 text-lg font-semibold">
            {averageTips}
          </p>
        </div>
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-[10px] text-muted-foreground">Hours reviewed</p>
          <p className="font-tabular mt-1 text-lg font-semibold">
            {totalMinutes > 0 ? (totalMinutes / 60).toFixed(1) : "0"}h
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeReportCharts({
  reports,
  currency,
}: {
  reports: PersonalShiftReport[];
  currency: string;
}) {
  return (
    <section
      aria-label="Personal tip charts"
      className="grid gap-5 xl:grid-cols-3"
    >
      <EarningsTrend reports={reports} currency={currency} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <TipMix reports={reports} currency={currency} />
        <EarningsPace reports={reports} currency={currency} />
      </div>
    </section>
  );
}
