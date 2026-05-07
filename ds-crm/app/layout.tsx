import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "DS-CRM | BBG Land Use & Incentives",
  description: "Relationship intelligence and matter pipeline for Belkin Burden Goldman LLP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex h-full bg-slate-50 font-sans">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
