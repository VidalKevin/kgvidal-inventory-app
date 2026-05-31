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
    <html lang="en" className="h-full bg-white">
      <body className="h-full min-h-screen overflow-x-hidden bg-white text-slate-900">
        <div className="flex min-h-screen w-full bg-white">
          <aside className="fixed left-0 top-0 z-40 h-screen w-72 bg-slate-900">
            <Sidebar />
          </aside>

          <div className="ml-72 flex min-h-screen w-[calc(100%-18rem)] flex-col bg-white">
            <Header />

            <main className="min-h-[calc(100vh-4rem)] flex-1 bg-white p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}