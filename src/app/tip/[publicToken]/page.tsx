import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TipForm, type PublicBillDetails } from "@/components/customer/tip-form";
import { getPrisma } from "@/lib/database/prisma";
import { isDatabaseReachable } from "@/lib/database/reachability";

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

async function findPublicBill(publicToken: string, allowOffline: boolean) {
  if (allowOffline && !(await isDatabaseReachable())) return null;
  try {
    return await getPrisma().bill.findUnique({
      where: { publicToken },
      select: {
        billNumber: true,
        totalPaise: true,
        status: true,
        restaurant: {
          select: {
            name: true,
            code: true,
            currency: true,
            defaultTipPercentages: true,
          },
        },
        table: { select: { number: true } },
        shift: { select: { status: true } },
      },
    });
  } catch (error) {
    if (!allowOffline) throw error;
    return null;
  }
}

export default async function PublicTipPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  const isDemo = publicToken === "demo-bill";
  const record = await findPublicBill(publicToken, isDemo);
  if (
    record &&
    record.status === "OPEN" &&
    record.shift.status === "OPEN"
  ) {
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
          isDemo: isDemo && record.restaurant.code === "DEMO",
        }}
      />
    );
  }

  if (isDemo) {
    return <TipForm publicBillToken={publicToken} bill={demoBill} />;
  }
  notFound();
}
