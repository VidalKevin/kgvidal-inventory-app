import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StickyTableSync from "@/components/StickyTableSync";

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
        <div className="fixed inset-0 flex bg-white">
          <aside className="h-full w-72 shrink-0 bg-slate-900">
            <Sidebar />
          </aside>

          <section className="flex h-full min-w-0 flex-1 flex-col bg-white">
            <Header />

            <main className="min-h-0 flex-1 overflow-y-auto bg-white px-8 pb-8">
              <StickyTableSync />
              {children}
            </main>
          </section>
        </div>
      </body>
    </html>
  );
}