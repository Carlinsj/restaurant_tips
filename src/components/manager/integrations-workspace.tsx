import Link from "next/link";
import { ArrowRight, FileSpreadsheet, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const importSteps = [
  "Export bills from your POS",
  "Upload the CSV file",
  "Review and confirm",
] as const;

export function IntegrationsWorkspace() {
  return (
    <div className="max-w-5xl space-y-6">
      <section>
        <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">POS setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">
          Bring your bills into TipSathi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Export a CSV from your billing system, review it, and import it. No technical setup is required.
        </p>
      </section>

      <Card className="border-border bg-card py-0">
        <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">Import a POS file</h2>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Works with any POS that can export bills as a CSV file.
                </p>
              </div>
            </div>

            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {importSteps.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <Button asChild size="lg">
            <Link href="/manager/integrations/csv">
              Import a POS file <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex max-w-3xl items-start gap-3 border-t border-border pt-5">
        <PlugZap className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm leading-6 text-muted-foreground">
          Automatic syncing requires official API access from your POS provider. Until that access is enabled,
          CSV import is the reliable option.
        </p>
      </div>
    </div>
  );
}
