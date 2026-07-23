import Link from "next/link";
import { ChevronRight, PlugZap, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const settings = [
  {
    title: "Restaurant profile",
    copy: "Saffron & Slate · INR · Asia/Kolkata",
    icon: Settings2,
  },
  {
    title: "Tip distribution rules",
    copy: "Weighted 70/30 · Default",
    icon: SlidersHorizontal,
  },
  {
    title: "POS import",
    copy: "Upload and review billing data",
    icon: PlugZap,
    href: "/manager/integrations",
  },
  {
    title: "Security & audit",
    copy: "Roles, sessions, and financial activity",
    icon: ShieldCheck,
  },
] as const;

function SettingsCard({ item }: { item: (typeof settings)[number] }) {
  return (
    <Card className="border-[#ded7ca] bg-white/76 py-4 shadow-none">
      <CardContent className="flex items-center gap-4 px-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#e5eee9] text-primary">
          <item.icon className="size-4" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.copy}</p>
        </div>
        {"href" in item ? (
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <Badge variant="outline">Not available yet</Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Available configuration is linked; unfinished areas are labeled clearly.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {settings.map((item) =>
          "href" in item ? (
            <Link
              href={item.href}
              key={item.title}
              className="rounded-2xl transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <SettingsCard item={item} />
            </Link>
          ) : (
            <SettingsCard item={item} key={item.title} />
          ),
        )}
      </div>
    </div>
  );
}
