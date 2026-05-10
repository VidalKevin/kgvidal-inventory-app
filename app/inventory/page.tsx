"use client";

import { useMemo, useState } from "react";
import PageTitle from "@/components/PageTitle";
import { Search, Filter, Plus, Minus, Save, X } from "lucide-react";

const PURCHASE_ORDERS_STORAGE_KEY = "kg_purchase_orders";

type InventoryRow = {
  category: string;
  vendor: string;
  sku: string;
  itemName: string;
  uom: "EA" | "PK";
  qty: number;
  cost: number;
  currentInventory: number;
  averageForecast: number;
  leadTime: string;
  needed: number;
  status: "Healthy" | "Low Stocks" | "Critical";
};

type PurchaseOrderRow = {
  id: number;
  vendor: string;
  customer: string;
  category: string;
  poNumber: string;
  sku: string;
  itemDescription: string;
  ordered: number;
  received: number | "";
  diff: number;
  expectedDate: string;
  status: string;
  invoiceNumber: string;
  amount: number;
};

type NewOrderRow = {
  id: number;
  sku: string;
  itemDescription: string;
  category: string;
  ordered: number;
  amount: number;
};

const inventoryRows: InventoryRow[] = [
  { category: "Category 1", vendor: "Vendor 1", sku: "SKU-1001", itemName: "Item 1", uom: "PK", qty: 12, cost: 12.5, currentInventory: 240, averageForecast: 180, leadTime: "7 Days", needed: 60, status: "Healthy" },
  { category: "Category 2", vendor: "Vendor 2", sku: "SKU-1002", itemName: "Item 2", uom: "EA", qty: 1, cost: 18, currentInventory: 40, averageForecast: 120, leadTime: "14 Days", needed: 80, status: "Low Stocks" },
  { category: "Category 3", vendor: "Vendor 3", sku: "SKU-1003", itemName: "Item 3", uom: "PK", qty: 15, cost: 22.75, currentInventory: 12, averageForecast: 100, leadTime: "21 Days", needed: 88, status: "Critical" },
  { category: "Category 4", vendor: "Vendor 1", sku: "SKU-1004", itemName: "Item 4", uom: "EA", qty: 1, cost: 9.5, currentInventory: 310, averageForecast: 250, leadTime: "10 Days", needed: 40, status: "Healthy" },
  { category: "Category 5", vendor: "Vendor 2", sku: "SKU-1005", itemName: "Item 5", uom: "PK", qty: 12, cost: 15.25, currentInventory: 90, averageForecast: 140, leadTime: "12 Days", needed: 50, status: "Low Stocks" },
  { category: "Category 6", vendor: "Vendor 3", sku: "SKU-1006", itemName: "Item 6", uom: "EA", qty: 1, cost: 30, currentInventory: 8, averageForecast: 90, leadTime: "30 Days", needed: 82, status: "Critical" },
  { category: "Category 7", vendor: "Vendor 1", sku: "SKU-1007", itemName: "Item 7", uom: "PK", qty: 15, cost: 11.99, currentInventory: 270, averageForecast: 200, leadTime: "9 Days", needed: 30, status: "Healthy" },
  { category: "Category 8", vendor: "Vendor 2", sku: "SKU-1008", itemName: "Item 8", uom: "EA", qty: 1, cost: 24.5, currentInventory: 55, averageForecast: 115, leadTime: "15 Days", needed: 60, status: "Low Stocks" },
  { category: "Category 9", vendor: "Vendor 3", sku: "SKU-1009", itemName: "Item 9", uom: "PK", qty: 12, cost: 17.75, currentInventory: 5, averageForecast: 75, leadTime: "28 Days", needed: 70, status: "Critical" },
  { category: "Category 10", vendor: "Vendor 1", sku: "SKU-1010", itemName: "Item 10", uom: "EA", qty: 1, cost: 28, currentInventory: 190, averageForecast: 150, leadTime: "11 Days", needed: 20, status: "Healthy" },
];

const customers = ["Customer 1", "Customer 2", "Customer 3"];

function formatMoney(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function getRunningAverage90Days(row: InventoryRow) {
  return Number((row.averageForecast / 90).toFixed(2));
}

function getLeadTimeDays(row: InventoryRow) {
  const match = String(row.leadTime || "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function getStockLevelDays(row: InventoryRow) {
  const runningAverage = getRunningAverage90Days(row);
  if (runningAverage <= 0) return 0;
  return Number((row.currentInventory / runningAverage).toFixed(1));
}

function getComputedNeededQty(row: InventoryRow, minimumStockDays: number) {
  const runningAverage = getRunningAverage90Days(row);
  const leadTimeDays = getLeadTimeDays(row);
  const targetInventory = runningAverage * (Math.max(0, minimumStockDays) + leadTimeDays);
  const needed = targetInventory - row.currentInventory;

  return Math.max(0, Math.ceil(needed));
}

function getOrderMultiple(row: InventoryRow) {
  return row.uom === "EA" ? 1 : row.qty;
}

function roundUpToMultiple(value: number, multiple: number) {
  if (multiple <= 1) return Math.max(0, Math.ceil(value));
  return Math.max(0, Math.ceil(value / multiple) * multiple);
}

function getSuggestedApprovedQty(row: InventoryRow, minimumStockDays: number) {
  return roundUpToMultiple(getComputedNeededQty(row, minimumStockDays), getOrderMultiple(row));
}

function getQtyOptions(row: InventoryRow) {
  const multiple = getOrderMultiple(row);
  if (multiple === 1) return Array.from({ length: 10 }, (_, index) => index + 1);
  return Array.from({ length: 10 }, (_, index) => multiple * (index + 1));
}

function getNextPoNumber(existingOrders: PurchaseOrderRow[]) {
  const maxNumber = existingOrders.reduce((max, order) => {
    const match = order.poNumber.match(/PO-(\d+)/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 23000);

  return `PO-${maxNumber + 1}`;
}

function readSavedPurchaseOrders() {
  if (typeof window === "undefined") return [] as PurchaseOrderRow[];

  try {
    const saved = window.localStorage.getItem(PURCHASE_ORDERS_STORAGE_KEY);
    if (!saved) return [] as PurchaseOrderRow[];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as PurchaseOrderRow[]) : [];
  } catch {
    return [] as PurchaseOrderRow[];
  }
}

function writeSavedPurchaseOrders(rows: PurchaseOrderRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PURCHASE_ORDERS_STORAGE_KEY, JSON.stringify(rows));
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [vendor, setVendor] = useState("All");
  const [status, setStatus] = useState("All");
  const [minimumStockDays, setMinimumStockDays] = useState(30);
  const [activeApprovedSku, setActiveApprovedSku] = useState<string | null>(null);
  const [approvedQtyBySku, setApprovedQtyBySku] = useState<Record<string, number>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVendor, setNewVendor] = useState("Vendor 1");
  const [newCustomer, setNewCustomer] = useState("Customer 1");
  const [shipDate, setShipDate] = useState("");
  const [newRows, setNewRows] = useState<NewOrderRow[]>([]);

  const categories = useMemo(() => Array.from(new Set(inventoryRows.map((item) => item.category))), []);
  const vendors = useMemo(() => Array.from(new Set(inventoryRows.map((item) => item.vendor))), []);
  const statuses = useMemo(() => Array.from(new Set(inventoryRows.map((item) => item.status))), []);

  const filteredRows = useMemo(() => {
    return inventoryRows.filter((item) => {
      const query = search.toLowerCase();
      const matchesSearch =
        item.sku.toLowerCase().includes(query) ||
        item.itemName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.vendor.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query);

      const matchesCategory = category === "All" || item.category === category;
      const matchesVendor = vendor === "All" || item.vendor === vendor;
      const matchesStatus = status === "All" || item.status === status;

      return matchesSearch && matchesCategory && matchesVendor && matchesStatus;
    });
  }, [search, category, vendor, status]);

  const rowsWithApprovedQty = useMemo(() => {
    return filteredRows.filter((item) => Number(approvedQtyBySku[item.sku] ?? 0) > 0);
  }, [approvedQtyBySku, filteredRows]);

  const totalCost = useMemo(() => {
    return filteredRows.reduce((total, item) => {
      const approvedQty = Number(approvedQtyBySku[item.sku] ?? 0);
      return total + approvedQty * item.cost;
    }, 0);
  }, [approvedQtyBySku, filteredRows]);

  const setApprovedQty = (sku: string, value: number) => {
    setApprovedQtyBySku((prev) => ({ ...prev, [sku]: Math.max(0, Number(value) || 0) }));
  };

  const bumpApprovedQty = (item: InventoryRow, direction: 1 | -1) => {
    const multiple = getOrderMultiple(item);
    const current = Number(approvedQtyBySku[item.sku] ?? 0);
    const next = direction === 1 ? current + multiple : Math.max(0, current - multiple);
    setApprovedQty(item.sku, next);
  };

  const openCreatePoFromApproved = () => {
    const rows = rowsWithApprovedQty;
    const vendorFromRows = vendor !== "All" ? vendor : rows[0]?.vendor ?? "Vendor 1";

    setNewVendor(vendorFromRows);
    setNewRows(
      rows
        .filter((row) => vendor === "All" || row.vendor === vendorFromRows)
        .map((row) => ({
          id: Date.now() + Math.floor(Math.random() * 100000),
          sku: row.sku,
          itemDescription: row.itemName,
          category: row.category,
          ordered: Number(approvedQtyBySku[row.sku] ?? 0),
          amount: Number(((approvedQtyBySku[row.sku] ?? 0) * row.cost).toFixed(2)),
        }))
    );
    setShowCreateModal(true);
  };

  const updateNewRow = (rowId: number, field: keyof NewOrderRow, value: string | number) => {
    setNewRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (field === "itemDescription") {
          const selectedItem = inventoryRows.find((item) => item.itemName === value);
          if (selectedItem) {
            const ordered = getSuggestedApprovedQty(selectedItem, minimumStockDays);
            return {
              ...row,
              sku: selectedItem.sku,
              itemDescription: selectedItem.itemName,
              category: selectedItem.category,
              ordered,
              amount: Number((ordered * selectedItem.cost).toFixed(2)),
            };
          }
        }

        if (field === "ordered") {
          const sourceItem = inventoryRows.find((item) => item.sku === row.sku);
          const ordered = Number(value) || 0;
          return {
            ...row,
            ordered,
            amount: sourceItem ? Number((ordered * sourceItem.cost).toFixed(2)) : row.amount,
          };
        }

        return { ...row, [field]: value };
      })
    );
  };

  const addNewRow = () => {
    setNewRows((prev) => [
      ...prev,
      { id: Date.now(), sku: "", itemDescription: "", category: "", ordered: 1, amount: 0 },
    ]);
  };

  const deleteNewRow = (rowId: number) => {
    setNewRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const saveNewPurchaseOrder = () => {
    const existingOrders = readSavedPurchaseOrders();
    const nextPoNumber = getNextPoNumber(existingOrders);
    const sharedInvoiceNumber = nextPoNumber.replace("PO-", "INV-");

    const newPurchaseOrderRows: PurchaseOrderRow[] = newRows
      .filter((row) => row.itemDescription && row.ordered > 0)
      .map((row, index) => ({
        id: Date.now() + index,
        vendor: newVendor,
        customer: newCustomer,
        category: row.category,
        poNumber: nextPoNumber,
        sku: row.sku,
        itemDescription: row.itemDescription,
        ordered: Number(row.ordered),
        received: 0,
        diff: 0,
        expectedDate: shipDate || new Date().toISOString().slice(0, 10),
        status: "Sent",
        invoiceNumber: sharedInvoiceNumber,
        amount: Number(row.amount),
      }));

    writeSavedPurchaseOrders([...newPurchaseOrderRows, ...existingOrders]);

    setShowCreateModal(false);
    setNewCustomer("Customer 1");
    setShipDate("");
    setNewRows([]);
    setApprovedQtyBySku({});
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Inventory"
        description="Track stock levels, forecasting, vendor distribution, and inventory health."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, item, category, vendor, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              Min Stock Days
              <input
                type="number"
                min={0}
                value={minimumStockDays}
                onChange={(e) => setMinimumStockDays(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm outline-none focus:border-slate-900"
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
              TC: {formatMoney(totalCost)}
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Filter size={18} />
              Filters
            </div>

            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900">
              <option value="All">All Categories</option>
              {categories.map((categoryName) => <option key={categoryName} value={categoryName}>{categoryName}</option>)}
            </select>

            <select value={vendor} onChange={(e) => setVendor(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900">
              <option value="All">All Vendors</option>
              {vendors.map((vendorName) => <option key={vendorName} value={vendorName}>{vendorName}</option>)}
            </select>

            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900">
              <option value="All">All Status</option>
              {statuses.map((statusName) => <option key={statusName} value={statusName}>{statusName}</option>)}
            </select>

            <button
              type="button"
              onClick={openCreatePoFromApproved}
              disabled={rowsWithApprovedQty.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
              Create PO
            </button>
          </div>
        </div>
      </div>

      {vendor !== "All" && rowsWithApprovedQty.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
          Showing {rowsWithApprovedQty.length} approved item{rowsWithApprovedQty.length === 1 ? "" : "s"} for {vendor}. Click Create PO to create a purchase order from the approved quantities.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">Category</th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">Vendor</th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">SKU</th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">Item</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Current Inv.</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Run Ave./Day</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Lead Time</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Stock Days</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Needed</th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">Approved Qty</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Cost</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">Total Cost</th>
                <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((item) => {
                const approvedQty = Number(approvedQtyBySku[item.sku] ?? 0);
                const multiple = getOrderMultiple(item);
                const isInvalidMultiple = approvedQty > 0 && approvedQty % multiple !== 0;
                const suggestedQty = getSuggestedApprovedQty(item, minimumStockDays);
                const neededQty = getComputedNeededQty(item, minimumStockDays);
                const isActive = activeApprovedSku === item.sku;

                return (
                  <tr key={item.sku} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">{item.category}</td>
                    <td className="whitespace-nowrap px-4 py-4">{item.vendor}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">{item.sku}</td>
                    <td className="whitespace-nowrap px-4 py-4">{item.itemName}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{item.currentInventory}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{getRunningAverage90Days(item)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{getLeadTimeDays(item)} days</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{getStockLevelDays(item)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums">{neededQty}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="relative min-w-44">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => bumpApprovedQty(item, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              aria-label={`Decrease approved quantity for ${item.sku}`}
                            >
                              <Minus size={14} />
                            </button>
                          )}

                          <input
                            type="number"
                            min={0}
                            step={multiple}
                            value={approvedQty}
                            onFocus={() => setActiveApprovedSku(item.sku)}
                            onClick={() => setActiveApprovedSku(item.sku)}
                            onChange={(e) => setApprovedQty(item.sku, Number(e.target.value))}
                            className={`h-8 w-24 rounded-lg border bg-white px-2 text-center text-sm outline-none ${isInvalidMultiple ? "border-red-300 bg-red-50" : isActive ? "border-slate-900" : "border-slate-300"}`}
                          />

                          {isActive && (
                            <button
                              type="button"
                              onClick={() => bumpApprovedQty(item, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              aria-label={`Increase approved quantity for ${item.sku}`}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>

                        {isActive && (
                          <div className="absolute left-0 top-10 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-semibold text-slate-500">Quick select</span>
                              <button
                                type="button"
                                onClick={() => setActiveApprovedSku(null)}
                                className="rounded-md px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                              >
                                Close
                              </button>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                              {getQtyOptions(item).map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setApprovedQty(item.sku, option);
                                    setActiveApprovedSku(null);
                                  }}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-900 hover:bg-slate-50"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setApprovedQty(item.sku, suggestedQty);
                                setActiveApprovedSku(null);
                              }}
                              className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Use suggested: {suggestedQty}
                            </button>

                            {isInvalidMultiple && (
                              <p className="mt-2 text-xs font-medium text-red-600">
                                Must be multiple of {multiple}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{formatMoney(item.cost)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums">{formatMoney(approvedQty * item.cost)}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "Healthy" ? "bg-green-100 text-green-700" : item.status === "Low Stocks" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-5 py-8 text-center text-sm text-slate-500">No inventory items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create New Purchase Order</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Vendor</label>
                  <select value={newVendor} onChange={(e) => setNewVendor(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900">
                    {vendors.map((vendorName) => <option key={vendorName} value={vendorName}>{vendorName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Customer</label>
                  <select value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900">
                    {customers.map((customer) => <option key={customer} value={customer}>{customer}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Ship Date</label>
                  <input type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">PO Total</label>
                  <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">
                    {formatMoney(newRows.reduce((total, row) => total + Number(row.amount || 0), 0))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Item</th>
                      <th className="px-4 py-3 text-left font-semibold">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold">Category</th>
                      <th className="px-4 py-3 text-left font-semibold">Ordered Qty</th>
                      <th className="px-4 py-3 text-left font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <input list="item-options" value={row.itemDescription} onChange={(e) => updateNewRow(row.id, "itemDescription", e.target.value)} placeholder="Type Item 1 to Item 10" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" />
                          <datalist id="item-options">{inventoryRows.map((item) => <option key={item.sku} value={item.itemName} />)}</datalist>
                        </td>
                        <td className="px-4 py-3">{row.sku || "-"}</td>
                        <td className="px-4 py-3">{row.category || "-"}</td>
                        <td className="px-4 py-3"><input type="number" value={row.ordered} onChange={(e) => updateNewRow(row.id, "ordered", Number(e.target.value))} className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" /></td>
                        <td className="px-4 py-3"><input type="number" value={row.amount} onChange={(e) => updateNewRow(row.id, "amount", Number(e.target.value))} className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" /></td>
                        <td className="px-4 py-3"><button type="button" onClick={() => deleteNewRow(row.id)} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50">Delete</button></td>
                      </tr>
                    ))}
                    {newRows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No approved items selected.</td></tr>}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={addNewRow} className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Plus size={16} />Add Row</button>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={saveNewPurchaseOrder} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"><Save size={16} />Save Purchase Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
