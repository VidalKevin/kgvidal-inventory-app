import type { Metadata } from "next";
import "./globals.css";
import AppFrame from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "KG Inventory",
  description: "Inventory Management App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className="h-full overflow-hidden bg-white text-slate-900">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
