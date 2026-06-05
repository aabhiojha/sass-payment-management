import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-roboto" });

export const metadata: Metadata = {
  title: "PayNext — Billing Management",
  description: "Recurring billing management for SaaS companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.variable} ${roboto.className}`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
