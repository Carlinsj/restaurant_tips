import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TipForm, type PublicBillDetails } from "@/components/customer/tip-form";
import { getPrisma } from "@/lib/database/prisma";

export const metadata: Metadata = { title: "Leave a tip" };

const demoBill: PublicBillDetails = {
  restaurantName: "Saffron & Slate",
  currency: "INR",
  tableNumber: 6,
  billNumber: "INV-1024-DEMO",
  totalPaise: 200_000,
  suggestedPercentages: [5, 10, 15],
  isDemo: true,
};

export default async function PublicTipPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  if (publicToken === "demo-bill") {
    return <TipForm publicBillToken={publicToken} bill={demoBill} />;
  }

  const record = await getPrisma().bill.findUnique({
    where: { publicToken },
    select: {
      billNumber: true,
      totalPaise: true,
      status: true,
      restaurant: {
        select: {
          name: true,
          currency: true,
          defaultTipPercentages: true,
        },
      },
      table: { select: { number: true } },
      shift: { select: { status: true } },
    },
  });

  if (!record || record.status !== "OPEN" || record.shift.status !== "OPEN") {
    notFound();
  }

  return (
    <TipForm
      publicBillToken={publicToken}
      bill={{
        restaurantName: record.restaurant.name,
        currency: record.restaurant.currency,
        tableNumber: record.table.number,
        billNumber: record.billNumber,
        totalPaise: record.totalPaise,
        suggestedPercentages: record.restaurant.defaultTipPercentages,
        isDemo: false,
      }}
    />
  );
}
