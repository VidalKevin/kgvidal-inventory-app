"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
  username: string;
  email: string;
  role: string;
};

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: CurrentUser } | null) => {
        setUser(data?.user ?? null);
      })
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Inventory Management
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
            Welcome, {user?.username || "Admin"}
          </div>
          {user ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
