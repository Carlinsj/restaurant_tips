import type { Metadata } from "next";
import { TipForm } from "@/components/customer/tip-form";

export const metadata: Metadata = { title: "Leave a tip" };

export default async function PublicTipPage({ params }: { params: Promise<{ publicToken: string }> }) {
  const { publicToken } = await params;
  return <TipForm publicBillToken={publicToken} />;
}
