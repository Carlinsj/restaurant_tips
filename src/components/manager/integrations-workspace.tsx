import Link from "next/link";
import { Button } from "@/components/ui/button";

const connectionOptions = [
  {
    title: "ChefOS",
    description: "Create a signed webhook endpoint for a ChefOS connection.",
    href: "/manager/integrations/connect?provider=CHEFOS",
    action: "Connect ChefOS",
  },
  {
    title: "Webhook",
    description:
      "Connect any POS or middleware that can send signed JSON events.",
    href: "/manager/integrations/connect?provider=UNIVERSAL_WEBHOOK",
    action: "Create webhook",
  },
  {
    title: "CSV import",
    description:
      "Import exported bills when the POS does not provide API access.",
    href: "/manager/integrations/csv",
    action: "Import file",
  },
] as const;

export function IntegrationsWorkspace() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">
        POS connections
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Choose the method supported by your restaurant software.
      </p>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
        {connectionOptions.map((option) => (
          <section
            key={option.title}
            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold">{option.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {option.description}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={option.href}>{option.action}</Link>
            </Button>
          </section>
        ))}
      </div>
    </div>
  );
}
