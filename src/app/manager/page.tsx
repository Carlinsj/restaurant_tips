import { ManagerDashboard } from "@/components/manager/manager-dashboard";
import { getManagerDashboardData } from "@/server/manager-dashboard";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  return <ManagerDashboard data={await getManagerDashboardData()} />;
}
