"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StickyTableSync from "@/components/StickyTableSync";

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <main className="h-full overflow-y-auto bg-slate-50">{children}</main>;
  }

  return (
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
  );
}
