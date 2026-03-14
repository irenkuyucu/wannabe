import type { Metadata } from "next";
import { bangers } from "@/app/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wannabe",
  description: "Synchronous multiplayer party game companion app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={bangers.variable}>{children}</body>
    </html>
  );
}
