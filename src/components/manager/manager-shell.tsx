"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  PlugZap,
  Settings,
  TableProperties,
  Users,
  WalletCards,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/brand";
import { cn } from "@/lib/utils";

const managerNavigation = [
  { label: "Overview", href: "/manager", icon: LayoutDashboard },
  { label: "Team", href: "/manager/employees", icon: Users },
  { label: "Floor", href: "/manager/tables", icon: TableProperties },
  { label: "Integrations", href: "/manager/integrations", icon: PlugZap },
  { label: "Payouts", href: "/manager/payouts", icon: WalletCards },
  { label: "Reports", href: "/manager/reports", icon: BarChart3 },
] as const;

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-foreground">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[248px] flex-col bg-[var(--sidebar)] px-4 py-5 text-[var(--sidebar-foreground)] lg:flex">
        <Brand inverse className="px-2" />
        <div className="mt-8 px-2">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">Workspace</p>
          <p className="mt-1.5 truncate text-sm font-medium">Saffron & Slate</p>
          <p className="mt-0.5 text-xs text-white/45">Bandra · Mumbai</p>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Manager navigation">
          {managerNavigation.map((item) => {
            const active = item.href === "/manager" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/56 hover:bg-white/6 hover:text-white",
                )}
              >
                <item.icon className={cn("size-[18px]", active && "text-[#f7c85b]")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <Link href="/manager/settings" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-white/55 hover:bg-white/6 hover:text-white">
            <Settings className="size-[18px]" /> Settings
          </Link>
          <Link href="/" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-white/55 hover:bg-white/6 hover:text-white">
            <LogOut className="size-[18px]" /> Sign out
          </Link>
        </div>
      </aside>

      <div className="lg:ps-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#ded8cb] bg-[#f5f1e8]/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Brand compact className="lg:hidden" />
          <div className="hidden lg:block">
            <p className="text-xs font-medium text-muted-foreground">Wednesday, 22 July</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative rounded-full">
              <Bell className="size-[18px]" />
              <span className="absolute end-2 top-2 size-1.5 rounded-full bg-[#d87345]" />
            </Button>
            <div className="ms-1 flex items-center gap-2.5">
              <Avatar className="size-8 border border-[#d8d1c2]">
                <AvatarFallback className="bg-[#dfece4] text-xs font-semibold text-primary">DM</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-none">Demo Manager</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Manager</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1480px] px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-10">
          {children}
        </main>
      </div>

      <nav aria-label="Manager mobile navigation" className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-6 rounded-2xl border border-white/10 bg-[#173a34]/96 p-1.5 shadow-[0_18px_48px_rgba(16,42,37,0.28)] backdrop-blur lg:hidden">
        {managerNavigation.map((item) => {
          const active = item.href === "/manager" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium", active ? "bg-white/10 text-white" : "text-white/50") }>
              <item.icon className={cn("size-[18px]", active && "text-[#f7c85b]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
