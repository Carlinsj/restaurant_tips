import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

const entryPoints = [
  {
    title: "Manager",
    description: "Manage shifts, staff, tips, payouts, and POS connections.",
    href: "/login",
    action: "Manager sign in",
  },
  {
    title: "Staff",
    description: "Review current earnings, previous shifts, and personal reports.",
    href: "/employee-login",
    action: "Staff sign in",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-5 sm:px-8">
          <Brand />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-20">
        <section className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Tip tracking for restaurant teams
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Connect bills, shifts, tips, and staff allocations in one auditable
            workflow.
          </p>
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {entryPoints.map((entry) => (
            <section
              key={entry.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h2 className="text-lg font-semibold">{entry.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                {entry.description}
              </p>
              <Button asChild className="mt-5">
                <Link href={entry.href}>{entry.action}</Link>
              </Button>
            </section>
          ))}
        </div>

        <section className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold">Test without signing in</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/manager">Manager demo</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/employee">Staff demo</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tip/demo-bill">Customer tip demo</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
