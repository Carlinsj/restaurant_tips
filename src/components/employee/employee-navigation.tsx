import Link from "next/link";
import { BarChart3, History, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type EmployeeView = "current" | "shifts" | "reports";

const navigationItems = [
  {
    view: "current",
    label: "Current shift",
    href: "/employee",
    icon: LayoutDashboard,
  },
  {
    view: "shifts",
    label: "Previous shifts",
    href: "/employee?view=shifts",
    icon: History,
  },
  {
    view: "reports",
    label: "Reports",
    href: "/employee?view=reports",
    icon: BarChart3,
  },
] as const;

export function EmployeeNavigation({ view }: { view: EmployeeView }) {
  return (
    <Card className="py-2 lg:sticky lg:top-6">
      <CardContent className="px-2">
        <p className="hidden px-3 pb-2 pt-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase lg:block">
          Staff menu
        </p>
        <nav
          aria-label="Staff dashboard"
          className="grid grid-cols-3 gap-1 lg:flex lg:flex-col"
        >
          {navigationItems.map((item) => {
            const active = item.view === view;
            return (
              <Link
                key={item.view}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-center text-[10px] font-medium transition-colors lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-start lg:text-xs",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
