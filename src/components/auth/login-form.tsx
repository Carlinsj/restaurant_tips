"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, LoaderCircle, LockKeyhole, Mail, Store } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ role }: { role: "manager" | "employee" }) {
  const manager = role === "manager";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = manager
      ? {
          restaurantCode: form.get("restaurantCode"),
          email: form.get("email"),
          password: form.get("password"),
        }
      : {
          restaurantCode: form.get("restaurantCode"),
          employeeCode: form.get("employeeCode"),
          pin: form.get("pin"),
        };
    try {
      const response = await fetch(`/api/auth/${role}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok || !result.redirectTo) {
        setError(result.error ?? "Sign in was not successful.");
      } else {
        window.location.assign(result.redirectTo);
      }
    } catch {
      setError("Unable to reach TipSathi. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="grid gap-2"><Label htmlFor="restaurantCode">Restaurant code</Label><div className="relative"><Store className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="restaurantCode" name="restaurantCode" defaultValue="DEMO" className="h-11 ps-9 uppercase" autoComplete="organization" required /></div></div>
      {manager ? (
        <>
          <div className="grid gap-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" name="email" type="email" defaultValue="manager@demo.in" className="h-11 ps-9" autoComplete="email" required /></div></div>
          <div className="grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><button type="button" className="text-xs text-primary hover:underline">Forgot password?</button></div><div className="relative"><LockKeyhole className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" name="password" type="password" placeholder="••••••••••••" className="h-11 ps-9" autoComplete="current-password" required /></div></div>
        </>
      ) : (
        <>
          <div className="grid gap-2"><Label htmlFor="employeeCode">Employee code</Label><Input id="employeeCode" name="employeeCode" defaultValue="W001" className="h-11 uppercase" autoComplete="username" required /></div>
          <div className="grid gap-2"><Label htmlFor="pin">4–6 digit PIN</Label><div className="relative"><KeyRound className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} placeholder="••••" className="h-12 ps-9 text-lg tracking-[0.45em]" autoComplete="current-password" required /></div></div>
        </>
      )}
      <Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{manager ? "Sign in to workspace" : "View my shift"}<ArrowRight className="ms-auto size-4" /></Button>
      <div className="relative py-1 text-center"><span className="relative z-10 bg-white px-3 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">or explore</span><span className="absolute inset-x-0 top-1/2 border-t" /></div>
      <Button type="button" variant="outline" className="h-11 w-full" asChild><Link href={manager ? "/manager" : "/employee"}>Open demo {manager ? "workspace" : "shift"}</Link></Button>
    </form>
  );
}
