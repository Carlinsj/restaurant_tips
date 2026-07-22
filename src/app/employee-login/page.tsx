import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Employee login" };

export default function EmployeeLoginPage() {
  return <AuthShell title="Check your shift" description="Use the restaurant code, your employee code, and your private PIN." alternate={{ label: "Manager or owner?", href: "/login" }}><LoginForm role="employee" /></AuthShell>;
}
