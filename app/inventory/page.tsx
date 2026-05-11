"use client";

import { useMemo, useState } from "react";
import PageTitle from "@/components/PageTitle";
import { Search, Plus, Minus, Upload, ChevronDown } from "lucide-react";

type InventoryStatus = "Healthy" | "Low Stocks" | "Critical";

type InventoryRow = {
  date: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  vendor: string;
  leadTime: number;
  currentQty: number;
  onOrder: number;
  sell90Day: number;
  weeklyRate: number;
  qtyNeeded: number;
  qtyApproved: number;
  daysOfInventory: number;
  status: InventoryStatus;
};

const sampleData: InventoryRow[] = [
  { date: "2026-05-11", productTitle: "Product A", variantTitle: "Red / Large", sku: "SKU-1001", vendor: "Vendor 1", leadTime: 7, currentQty: 240, onOrder: 0, sell90Day: 180, weeklyRate: 14, qtyNeeded: 60, qtyApproved: 0, daysOfInventory: 120, status: "Healthy" },
  { date: "2026-05-11", productTitle: "Product B", variantTitle: "Blue / Small", sku: "SKU-1002", vendor: "Vendor 2", leadTime: 14, currentQty: 40, onOrder: 20, sell90Day: 120, weeklyRate: 9, qtyNeeded: 80, qtyApproved: 0, daysOfInventory: 30, status: "Low Stocks" },
  { date: "2026-05-11", productTitle: "Product C", variantTitle: "Default", sku: "SKU-1003", vendor: "Vendor 3", leadTime: 21, currentQty: 12, onOrder: 0, sell90Day: 100, weeklyRate: 7, qtyNeeded: 88, qtyApproved: 0, daysOfInventory: 10, status: "Critical" },
  { date: "2026-05-10", productTitle: "Product D", variantTitle: "Green / Medium", sku: "SKU-1004", vendor: "Vendor 1", leadTime: 10, currentQty: 310, onOrder: 50, sell90Day: 250, weeklyRate: 19, qtyNeeded: 40, qtyApproved: 0, daysOfInventory: 111, status: "Healthy" },
  { date: "2026-05-10", productTitle: "Product E", variantTitle: "Black / XL", sku: "SKU-1005", vendor: "Vendor 2", leadTime: 12, currentQty: 90, onOrder: 10, sell90Day: 140, weeklyRate: 10, qtyNeeded: 50, qtyApproved: 0, daysOfInventory: 57, status: "Low Stocks" },
  { date: "2026-05-10", productTitle: "Product F", variantTitle: "White / S", sku: "SKU-1006", vendor: "Vendor 3", leadTime: 30, currentQty: 8, onOrder: 0, sell90Day: 90, weeklyRate: 7, qtyNeeded: 82, qtyApproved: 0, daysOfInventory: 8, status: "Critical" },
];

type ColumnFilterKey = "productTitle" | "variantTitle" | "sku" | "vendor" | "status";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [approvedQtyBySku, setApprovedQtyBySku] = useState<Record<string, number>>({});
  const [activeApprovedSku, setActiveApprovedSku] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [columnFilters, setColumnFilters] = useState<Record<ColumnFilterKey, string>>({
    productTitle: "All",
    variantTitle: "All",
    sku: "All",
    vendor: "All",
    status: "All",
  });
  const [openDropdown, setOpenDropdown] = useState<ColumnFilterKey | null>(null);

  const dates = useMemo(() => {
    const all = Array.from(new Set(sampleData.map((r) => r.date))).sort((a, b) => b.localeCompare(a));
    return all;
  }, []);

  const latestDate = dates[0] ?? "";
  const effectiveDate = selectedDate || latestDate;

  const uniqueValues = (key: ColumnFilterKey) =>
    Array.from(new Set(sampleData.map((r) => String(r[key])))).sort();

  const filteredRows = useMemo(() => {
    return sampleData.filter((row) => {
      const matchesDate = row.date === effectiveDate;
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        row.sku.toLowerCase().includes(query) ||
        row.productTitle.toLowerCase().includes(query) ||
        row.variantTitle.toLowerCase().includes(query) ||
        row.vendor.toLowerCase().includes(query);

      const matchesColumns = (Object.keys(columnFilters) as ColumnFilterKey[]).every((key) => {
        return columnFilters[key] === "All" || String(row[key]) === columnFilters[key];
      });

      return matchesDate && matchesSearch && matchesColumns;
    });
  }, [search, effectiveDate, columnFilters]);

  const setApprovedQty = (sku: string, value: number) => {
    setApprovedQtyBySku((prev) => ({ ...prev, [sku]: Math.max(0, value) }));
  };

  const bumpQty = (sku: string, direction: 1 | -1) => {
    const current = approvedQtyBySku[sku] ?? 0;
    setApprovedQty(sku, current + direction);
  };

  const setColumnFilter = (key: ColumnFilterKey, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const headers: { label: string; key?: ColumnFilterKey; align?: string }[] = [
    { label: "Product Title", key: "productTitle" },
    { label: "Variant Title", key: "variantTitle" },
    { label: "SKU", key: "sku" },
    { label: "Vendor", key: "vendor" },
    { label: "Lead Time", align: "text-right" },
    { label: "Current Qty", align: "text-right" },
    { label: "On Order", align: "text-right" },
    { label: "90 Day Sell Rate", align: "text-right" },
    { label: "Weekly Sell Rate", align: "text-right" },
    { label: "Qty Needed", align: "text-right" },
    { label: "Qty Approved" },
    { label: "Days of Inventory", align: "text-right" },
    { label: "Status", key: "status" },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Inventory"
        description="Track stock levels, forecasting, vendor distribution, and inventory health."
      />

      {/* Top Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {/* Search */}
          <div className="relative w-full xl:max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, product, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Date:</label>
              <select
                value={effectiveDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
              >
                {dates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Upload Buttons */}
            <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload size={15} /> Upload Inventory
            </button>
            <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload size={15} /> Vidal 90 Day Sales
            </button>
            <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload size={15} /> PD 90 Day Sales
            </button>
            <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload size={15} /> On Order
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {headers.map((h) => (
                  <th key={h.label} className={`whitespace-nowrap px-4 py-3 text-left font-semibold ${h.align ?? ""}`}>
                    {h.key ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === h.key ? null : h.key!)}
                          className="flex items-center gap-1 hover:text-slate-900"
                        >
                          {h.label}
                          <ChevronDown size={14} className={`transition-transform ${openDropdown === h.key ? "rotate-180" : ""}`} />
                          {columnFilters[h.key!] !== "All" && (
                            <span className="ml-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                              {columnFilters[h.key!]}
                            </span>
                          )}
                        </button>
                        {openDropdown === h.key && (
                          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={() => setColumnFilter(h.key!, "All")}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              All
                            </button>
                            {uniqueValues(h.key!).map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setColumnFilter(h.key!, val)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      h.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => {
                const approvedQty = approvedQtyBySku[row.sku] ?? 0;
                const isActive = activeApprovedSku === row.sku;

                return (
                  <tr key={row.sku} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">{row.productTitle}</td>
                    <td className="whitespace-nowrap px-4 py-4">{row.variantTitle}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">{row.sku}</td>
                    <td className="whitespace-nowrap px-4 py-4">{row.vendor}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">{row.leadTime} days</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{row.currentQty}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{row.onOrder}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{row.sell90Day}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{row.weeklyRate}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums">{row.qtyNeeded}</td>

                    {/* Qty Approved */}
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className={`flex overflow-hidden rounded-xl border bg-white ${isActive ? "border-slate-900" : "border-slate-300"}`}>
                          {isActive && (
                            <button type="button" onClick={() => bumpQty(row.sku, -1)} className="flex h-9 w-9 items-center justify-center border-r border-slate-300 text-slate-600 hover:bg-slate-100">
                              <Minus size={14} />
                            </button>
                          )}
                          <input
                            type="number"
                            min={0}
                            value={approvedQty}
                            onFocus={() => setActiveApprovedSku(row.sku)}
                            onClick={() => setActiveApprovedSku(row.sku)}
                            onChange={(e) => setApprovedQty(row.sku, Number(e.target.value))}
                            className="h-9 w-20 border-0 bg-white px-2 text-center text-sm font-semibold outline-none"
                          />
                          {isActive && (
                            <button type="button" onClick={() => bumpQty(row.sku, 1)} className="flex h-9 w-9 items-center justify-center border-l border-slate-300 text-slate-600 hover:bg-slate-100">
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{row.daysOfInventory}</td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.status === "Healthy" ? "bg-green-100 text-green-700" :
                        row.status === "Low Stocks" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-5 py-8 text-center text-sm text-slate-500">
                    No inventory items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}