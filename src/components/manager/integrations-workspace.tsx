import Link from "next/link";
import { ArrowRight, FileSpreadsheet } from "lucide-react";
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
          Export a bill CSV from your restaurant software, review it, and import it. Common POS column names
          are recognized automatically.
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
                  The broadest option for POS systems that can export bill data.
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
    </div>
  );
}
