import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

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
    <html lang="en">
      <body className="bg-slate-900 text-slate-900">
        <div className="flex min-h-screen">
          <div className="fixed left-0 top-0 h-screen w-72 bg-slate-900 z-40">
            <Sidebar />
          </div>
          <div className="flex flex-1 flex-col ml-72 bg-white">
            <Header />
            <main className="flex-1 bg-white p-8 min-h-screen">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}