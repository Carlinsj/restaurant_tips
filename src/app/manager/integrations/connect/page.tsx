import type { Metadata } from "next";
import { WebhookConnectionSetup } from "@/components/manager/webhook-connection-setup";

export const metadata: Metadata = { title: "Connect restaurant software" };

export default async function ConnectIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string | string[] }>;
}) {
  const { provider } = await searchParams;
  return (
    <WebhookConnectionSetup
      provider={provider === "CHEFOS" ? "CHEFOS" : "UNIVERSAL_WEBHOOK"}
    />
  );
}
