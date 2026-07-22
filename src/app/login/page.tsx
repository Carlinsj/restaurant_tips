import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Manager login" };

export default function ManagerLoginPage() {
  return <AuthShell title="Welcome back" description="Sign in to manage shifts, allocations, payouts, and POS connections." alternate={{ label: "Restaurant team member?", href: "/employee-login" }}><LoginForm role="manager" /></AuthShell>;
}
