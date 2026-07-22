import type { Metadata } from "next";
import { EmployeeDashboard } from "@/components/employee/employee-dashboard";

export const metadata: Metadata = { title: "My shift" };

export default function EmployeePage() {
  return <EmployeeDashboard />;
}
