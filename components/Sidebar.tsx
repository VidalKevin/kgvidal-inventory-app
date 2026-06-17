"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  Folder,
  FileX2,
  PackageCheck,
  OctagonPause,
  BookOpen,
  Building2,
  PackageSearch,
  UserCog,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type ChildItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: ChildItem[];
};

type MenuItem = {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: ChildItem[];
};

const menuItems: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Inventory",
    icon: Boxes,
    children: [
      {
        label: "Days of Inventory",
        href: "/inventory",
        icon: CalendarDays,
      },
      {
        label: "Purchase Order",
        href: "/purchase-orders",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Fulfillment",
    icon: PackageCheck,
    children: [
      {
        label: "Order on Hold",
        href: "/reports/in-transit",
        icon: OctagonPause,
      },
    ],
  },
  { label: "Weekly Reports", href: "/reports/weekly", icon: CalendarDays },
  { label: "Monthly Reports", href: "/reports/monthly", icon: CalendarRange },
  {
    label: "Files",
    icon: Folder,
    children: [
      {
        label: "Discontinued Items",
        href: "/files/discontinued-items",
        icon: FileX2,
      },
    ],
  },
  {
    label: "Masters",
    icon: BookOpen,
    children: [
      { label: "Vendors List", href: "/masters/vendors", icon: Building2 },
      {
        label: "Item Master List",
        href: "/masters/item-master-list",
        icon: PackageSearch,
      },
    ],
  },
  {
    label: "Manage Users",
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
    Inventory:
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/purchase-orders"),
    Files: pathname.startsWith("/files"),
    Fulfillment: pathname.startsWith("/reports/in-transit"),
    Masters: pathname.startsWith("/masters"),
    "Manage Users": pathname.startsWith("/manage-user"),
  });

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isActive = (href?: string) => Boolean(href) && pathname === href;
  const isChildOpen = (child: ChildItem) =>
    Boolean(child.children?.some((nested) => isActive(nested.href)));

  return (
    <aside className="flex h-screen w-full flex-col bg-slate-900 text-slate-300">
      <div className="border-b border-slate-800 px-6 py-5">
        <h1 className="text-xl font-bold text-white">KG ERP</h1>
        <p className="mt-1 text-sm text-slate-400">System Portal</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
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

                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>

              {isOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {item.children?.map((child) => {
                    const ChildIcon = child.icon;
                    const childOpen = openMenus[child.label] || isChildOpen(child);

                    if (child.children) {
                      return (
                        <div key={child.label}>
                          <button
                            type="button"
                            onClick={() => toggleMenu(child.label)}
                            className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
                          >
                            <span className="flex items-center gap-3">
                              <ChildIcon size={18} />
                              <span>{child.label}</span>
                            </span>
                            {childOpen ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>

                          {childOpen && (
                            <div className="mt-1 space-y-1 pl-4">
                              {child.children.map((nested) => {
                                const NestedIcon = nested.icon;

                                return (
                                  <Link
                                    key={nested.href}
                                    href={nested.href ?? "#"}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
                                      isActive(nested.href)
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                    }`}
                                  >
                                    <NestedIcon size={18} />
                                    <span>{nested.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={child.href}
                        href={child.href ?? "#"}
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

    </aside>
  );
}
