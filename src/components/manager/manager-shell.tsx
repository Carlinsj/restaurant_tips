"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  PlugZap,
  Settings,
  TableProperties,
  Users,
  WalletCards,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/shared/brand";
import { cn } from "@/lib/utils";

const managerNavigation = [
  { label: "Overview", href: "/manager", icon: LayoutDashboard },
  { label: "Team", href: "/manager/employees", icon: Users },
  { label: "Floor", href: "/manager/tables", icon: TableProperties },
  { label: "POS import", href: "/manager/integrations", icon: PlugZap },
  { label: "Payouts", href: "/manager/payouts", icon: WalletCards },
  { label: "Reports", href: "/manager/reports", icon: BarChart3 },
] as const;

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <Brand inverse className="px-2" />
        <div className="mt-8 px-2">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45 uppercase">Workspace</p>
          <p className="mt-1.5 truncate text-sm font-medium">Saffron & Slate</p>
          <p className="mt-0.5 text-xs text-white/50">Bandra · Mumbai</p>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Manager navigation">
          {managerNavigation.map((item) => {
            const active = item.href === "/manager" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/60 hover:bg-white/7 hover:text-white",
                )}
              >
                <item.icon className={cn("size-[18px]", active && "text-amber-300")} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <Link href="/manager/settings" className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/60 hover:bg-white/7 hover:text-white">
            <Settings className="size-[18px]" aria-hidden="true" /> Settings
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <div className="lg:ps-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Brand compact className="lg:hidden" />
          <div className="hidden items-center gap-3 lg:flex">
            <p className="text-xs font-medium text-muted-foreground">Wednesday, 22 July</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="ms-1 flex items-center gap-2.5">
              <Avatar className="size-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">DM</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-none">Restaurant Manager</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Manager</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          {children}
        </main>
      </div>

      <nav aria-label="Manager mobile navigation" className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-6 rounded-xl border border-white/10 bg-sidebar/96 p-1.5 shadow-xl backdrop-blur lg:hidden">
        {managerNavigation.map((item) => {
          const active = item.href === "/manager" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium", active ? "bg-white/12 text-white" : "text-white/55") }>
              <item.icon className={cn("size-[18px]", active && "text-amber-300")} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
