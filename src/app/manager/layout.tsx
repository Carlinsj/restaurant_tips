import type { Metadata } from "next";
import { ManagerShell } from "@/components/manager/manager-shell";

export const metadata: Metadata = {
  title: "Manager workspace",
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ManagerShell>{children}</ManagerShell>;
}
