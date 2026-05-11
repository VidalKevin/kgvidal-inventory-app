"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  BarChart3,
  Truck,
  BookOpen,
  Building2,
  Users,
  PackageSearch,
  UserCog,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type ChildItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type MenuItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: ChildItem[];
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
  },
  {
    label: "Purchase Order",
    href: "/purchase-order",
    icon: ClipboardList,
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      {
        label: "In-transit",
        href: "/reports/in-transit",
        icon: Truck,
      },
    ],
  },
  {
    label: "Masters",
    icon: BookOpen,
    children: [
      {
        label: "Vendors",
        href: "/masters/vendors",
        icon: Building2,
      },
      {
        label: "Customers",
        href: "/masters/customers",
        icon: Users,
      },
      {
        label: "Item Master List",
        href: "/masters/item-master-list",
        icon: PackageSearch,
      },
    ],
  },
  {
    label: "Manage User",
    icon: UserCog,
    children: [
      {
        label: "User Access",
        href: "/manage-user/user-access",
        icon: ShieldCheck,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Reports: pathname.startsWith("/reports"),
    Masters: pathname.startsWith("/masters"),
    "Manage User": pathname.startsWith("/manage-user"),
  });

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col self-stretch min-h-screen">
      <div className="flex flex-col h-full flex-1">
        <div className="border-b border-slate-800 px-6 py-5">
          <h1 className="text-xl font-bold text-white">Inventory</h1>
          <p className="mt-1 text-sm text-slate-400">Management Portal</p>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive(item.href)
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            }

            const isOpen = openMenus[item.label];

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={20} />
                    {item.label}
                  </span>

                  {isOpen ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>

                {isOpen && (
                  <div className="mt-1 space-y-1 pl-4">
                    {item.children?.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
                            isActive(child.href)
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <ChildIcon size={18} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-6 py-4">
          <p className="text-xs text-slate-500">Logged in as</p>
          <p className="text-sm font-medium text-white">Admin</p>
        </div>
      </div>
    </aside>
  );
}