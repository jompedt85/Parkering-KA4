import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Parkering · KA4",
  description: "Bookingsystem for parkering på Karenslyst allé 4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
