import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TipSathi — Tips, shared fairly",
    template: "%s · TipSathi",
  },
  description:
    "A transparent tip tracking and distribution workspace for restaurant teams in India.",
  applicationName: "TipSathi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
