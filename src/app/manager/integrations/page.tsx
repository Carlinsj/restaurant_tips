import type { Metadata } from "next";
import { IntegrationsWorkspace } from "@/components/manager/integrations-workspace";

export const metadata: Metadata = { title: "POS integrations" };

export default function IntegrationsPage() {
  return <IntegrationsWorkspace />;
}
