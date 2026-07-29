import type { Metadata } from "next";
import { EmployeeDashboard } from "@/components/employee/employee-dashboard";
import type { EmployeeView } from "@/components/employee/employee-navigation";
import { getEmployeeDashboardData } from "@/server/employee-dashboard";

export const metadata: Metadata = { title: "My shift" };

function employeeView(value: string | string[] | undefined): EmployeeView {
  if (value === "shifts" || value === "reports") return value;
  return "current";
}

export default async function EmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ view }, data] = await Promise.all([
    searchParams,
    getEmployeeDashboardData(),
  ]);
  return <EmployeeDashboard data={data} view={employeeView(view)} />;
}
