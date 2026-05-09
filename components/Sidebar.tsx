"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const directLinks: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Inventory", href: "/inventory" },
  { label: "Purchase Order", href: "/purchase-order" },
];

const groupedLinks: NavGroup[] = [
  {
    label: "Reports",
    items: [{ label: "In-transit", href: "/reports/in-transit" }],
  },
  {
    label: "Masters",
    items: [
      { label: "Vendors", href: "/masters/vendors" },
      { label: "Customers", href: "/masters/customers" },
      { label: "Item Master List", href: "/masters/item-master-list" },
    ],
  },
  {
    label: "Manage User",
    items: [{ label: "User Access", href: "/manage-user/user-access" }],
  },
];

function navItemClass(isActive: boolean) {
  return `block rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const renderNavContent = () => (
    <>
      <div className="mb-6">
        <h1 className="text-lg font-bold tracking-tight">KG Inventory</h1>
        <p className="text-xs text-slate-500">Management Portal</p>
      </div>

      <nav className="space-y-4">
        <div className="space-y-1">
          {directLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navItemClass(pathname === item.href)}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {groupedLinks.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navItemClass(pathname === item.href)}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow md:hidden"
        onClick={() => setIsOpen(true)}
      >
        Menu
      </button>

      <aside className="hidden w-72 border-r border-slate-200 bg-white p-5 md:block">
        {renderNavContent()}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsOpen(false)}
          />
          <aside className="relative h-full w-72 border-r border-slate-200 bg-white p-5">
            <button
              type="button"
              className="mb-4 rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
}
