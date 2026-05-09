"use client";

import { useMemo, useState } from "react";
import PageTitle from "@/components/PageTitle";
import {
  Search,
  Filter,
  Pencil,
  Plus,
  Trash2,
  X,
  Save,
} from "lucide-react";

const items = Array.from({ length: 10 }, (_, index) => ({
  sku: `SKU-${1001 + index}`,
  itemDescription: `Item ${index + 1}`,
  category: `Category ${index + 1}`,
}));

const statuses = [
  "Sent",
  "Confirmed by Vendor",
  "In Transit",
  "Received",
  "Invoiced",
];

const vendors = ["Vendor 1", "Vendor 2", "Vendor 3"];

type PurchaseOrderRow = {
  id: number;
  vendor: string;
  customer: string;
  category: string;
  poNumber: string;
  sku: string;
  itemDescription: string;
  ordered: number;
  received: number;
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

const initialPurchaseOrders: PurchaseOrderRow[] = [
  {
    id: 1,
    vendor: "Vendor 1",
    customer: "Customer 1",
    category: "Category 1",
    poNumber: "PO-23001",
    sku: "SKU-1001",
    itemDescription: "Item 1",
    ordered: 100,
    received: 80,
    expectedDate: "2026-05-18",
    status: "Sent",
    invoiceNumber: "INV-1001",
    amount: 1200,
  },
  {
    id: 2,
    vendor: "Vendor 1",
    customer: "Customer 1",
    category: "Category 2",
    poNumber: "PO-23001",
    sku: "SKU-1002",
    itemDescription: "Item 2",
    ordered: 200,
    received: 200,
    expectedDate: "2026-05-18",
    status: "Received",
    invoiceNumber: "INV-1001",
    amount: 2400,
  },
  {
    id: 3,
    vendor: "Vendor 1",
    customer: "Customer 1",
    category: "Category 3",
    poNumber: "PO-23001",
    sku: "SKU-1003",
    itemDescription: "Item 3",
    ordered: 150,
    received: 100,
    expectedDate: "2026-05-18",
    status: "In Transit",
    invoiceNumber: "",
    amount: 1800,
  },
  {
    id: 4,
    vendor: "Vendor 2",
    customer: "Customer 2",
    category: "Category 4",
    poNumber: "PO-23002",
    sku: "SKU-1004",
    itemDescription: "Item 4",
    ordered: 75,
    received: 75,
    expectedDate: "2026-05-21",
    status: "Confirmed by Vendor",
    invoiceNumber: "",
    amount: 950,
  },
  {
    id: 5,
    vendor: "Vendor 2",
    customer: "Customer 2",
    category: "Category 5",
    poNumber: "PO-23002",
    sku: "SKU-1005",
    itemDescription: "Item 5",
    ordered: 300,
    received: 250,
    expectedDate: "2026-05-21",
    status: "In Transit",
    invoiceNumber: "",
    amount: 4100,
  },
  {
    id: 6,
    vendor: "Vendor 2",
    customer: "Customer 2",
    category: "Category 6",
    poNumber: "PO-23002",
    sku: "SKU-1006",
    itemDescription: "Item 6",
    ordered: 60,
    received: 60,
    expectedDate: "2026-05-21",
    status: "Invoiced",
    invoiceNumber: "INV-1002",
    amount: 780,
  },
  {
    id: 7,
    vendor: "Vendor 3",
    customer: "Customer 3",
    category: "Category 7",
    poNumber: "PO-23003",
    sku: "SKU-1007",
    itemDescription: "Item 7",
    ordered: 90,
    received: 0,
    expectedDate: "2026-05-25",
    status: "Sent",
    invoiceNumber: "",
    amount: 990,
  },
  {
    id: 8,
    vendor: "Vendor 3",
    customer: "Customer 3",
    category: "Category 8",
    poNumber: "PO-23003",
    sku: "SKU-1008",
    itemDescription: "Item 8",
    ordered: 120,
    received: 0,
    expectedDate: "2026-05-25",
    status: "Confirmed by Vendor",
    invoiceNumber: "",
    amount: 1600,
  },
  {
    id: 9,
    vendor: "Vendor 3",
    customer: "Customer 3",
    category: "Category 9",
    poNumber: "PO-23003",
    sku: "SKU-1009",
    itemDescription: "Item 9",
    ordered: 50,
    received: 25,
    expectedDate: "2026-05-25",
    status: "In Transit",
    invoiceNumber: "",
    amount: 700,
  },
  {
    id: 10,
    vendor: "Vendor 3",
    customer: "Customer 3",
    category: "Category 10",
    poNumber: "PO-23003",
    sku: "SKU-1010",
    itemDescription: "Item 10",
    ordered: 180,
    received: 180,
    expectedDate: "2026-05-25",
    status: "Received",
    invoiceNumber: "INV-1003",
    amount: 3200,
  },
];

export default function PurchaseOrderPage() {
  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrderRow[]>(initialPurchaseOrders);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [vendor, setVendor] = useState("All");
  const [status, setStatus] = useState("All");

  const [editingPoNumber, setEditingPoNumber] = useState<string | null>(null);
  const [editingRows, setEditingRows] = useState<PurchaseOrderRow[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVendor, setNewVendor] = useState("Vendor 1");
  const [newCustomer, setNewCustomer] = useState("Customer 1");
  const [shipDate, setShipDate] = useState("");
  const [newRows, setNewRows] = useState<NewOrderRow[]>([
    {
      id: Date.now(),
      sku: "",
      itemDescription: "",
      category: "",
      ordered: 0,
      amount: 0,
    },
  ]);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const matchesSearch =
        order.vendor.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase()) ||
        order.category.toLowerCase().includes(search.toLowerCase()) ||
        order.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.sku.toLowerCase().includes(search.toLowerCase()) ||
        order.itemDescription.toLowerCase().includes(search.toLowerCase()) ||
        order.status.toLowerCase().includes(search.toLowerCase()) ||
        order.invoiceNumber.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || order.category === category;

      const matchesVendor = vendor === "All" || order.vendor === vendor;

      const matchesStatus = status === "All" || order.status === status;

      return matchesSearch && matchesCategory && matchesVendor && matchesStatus;
    });
  }, [purchaseOrders, search, category, vendor, status]);

  const poHeader = editingRows[0];

  const poTotalAmount = editingRows.reduce(
    (total, row) => total + Number(row.amount || 0),
    0
  );

  const openPoDetails = (poNumber: string) => {
    const rows = purchaseOrders.filter((order) => order.poNumber === poNumber);
    setEditingPoNumber(poNumber);
    setEditingRows(rows);
  };

  const closePoDetails = () => {
    setEditingPoNumber(null);
    setEditingRows([]);
  };

  const updateEditingRow = (
    rowId: number,
    field: keyof PurchaseOrderRow,
    value: string | number
  ) => {
    setEditingRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const copyAllQty = () => {
    setEditingRows((prev) =>
      prev.map((row) => ({
        ...row,
        received: row.ordered,
      }))
    );
  };

  const savePoDetails = () => {
    setPurchaseOrders((prev) =>
      prev.map((order) => {
        const updatedRow = editingRows.find((row) => row.id === order.id);
        return updatedRow || order;
      })
    );

    closePoDetails();
  };

  const updateNewRow = (
    rowId: number,
    field: keyof NewOrderRow,
    value: string | number
  ) => {
    setNewRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (field === "itemDescription") {
          const selectedItem = items.find(
            (item) => item.itemDescription === value
          );

          if (selectedItem) {
            return {
              ...row,
              sku: selectedItem.sku,
              itemDescription: selectedItem.itemDescription,
              category: selectedItem.category,
            };
          }
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  };

  const addNewRow = () => {
    setNewRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        sku: "",
        itemDescription: "",
        category: "",
        ordered: 0,
        amount: 0,
      },
    ]);
  };

  const deleteNewRow = (rowId: number) => {
    setNewRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const saveNewPurchaseOrder = () => {
    const nextPoNumber = `PO-${23004}`;

    const newPurchaseOrderRows = newRows
      .filter((row) => row.itemDescription)
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
        expectedDate: shipDate || "2026-06-01",
        status: "Sent",
        invoiceNumber: "",
        amount: Number(row.amount),
      }));

    setPurchaseOrders((prev) => [...prev, ...newPurchaseOrderRows]);

    setShowCreateModal(false);
    setNewVendor("Vendor 1");
    setNewCustomer("Customer 1");
    setShipDate("");
    setNewRows([
      {
        id: Date.now(),
        sku: "",
        itemDescription: "",
        category: "",
        ordered: 0,
        amount: 0,
      },
    ]);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageTitle
          title="Purchase Order"
          description="Monitor procurement progress and vendor delivery timelines."
        />

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus size={18} />
          Create New Purchase Order
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search PO, SKU, item, vendor, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Filter size={18} />
              Filters
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            >
              <option value="All">All Categories</option>
              {items.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category}
                </option>
              ))}
            </select>

            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            >
              <option value="All">All Vendors</option>
              {vendors.map((vendorName) => (
                <option key={vendorName} value={vendorName}>
                  {vendorName}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            >
              <option value="All">All Status</option>
              {statuses.map((statusName) => (
                <option key={statusName} value={statusName}>
                  {statusName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Vendor</th>
                <th className="px-5 py-4 text-left font-semibold">Category</th>
                <th className="px-5 py-4 text-left font-semibold">PO Number</th>
                <th className="px-5 py-4 text-left font-semibold">SKU</th>
                <th className="px-5 py-4 text-left font-semibold">
                  Item Description
                </th>
                <th className="px-5 py-4 text-left font-semibold">Ordered</th>
                <th className="px-5 py-4 text-left font-semibold">Received</th>
                <th className="px-5 py-4 text-left font-semibold">Diff</th>
                <th className="px-5 py-4 text-left font-semibold">
                  Expected Date
                </th>
                <th className="px-5 py-4 text-left font-semibold">Status</th>
                <th className="px-5 py-4 text-left font-semibold">Invoice#</th>
                <th className="px-5 py-4 text-left font-semibold">Amount</th>
                <th className="px-5 py-4 text-left font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-5 py-4">{order.vendor}</td>
                  <td className="px-5 py-4">{order.category}</td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    {order.poNumber}
                  </td>
                  <td className="px-5 py-4">{order.sku}</td>
                  <td className="px-5 py-4">{order.itemDescription}</td>
                  <td className="px-5 py-4">{order.ordered}</td>
                  <td className="px-5 py-4">{order.received}</td>
                  <td className="px-5 py-4">{order.ordered - order.received}</td>
                  <td className="px-5 py-4">{order.expectedDate}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">{order.invoiceNumber || "-"}</td>
                  <td className="px-5 py-4">
                    ${order.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => openPoDetails(order.poNumber)}
                      className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={13}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No purchase orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPoNumber && poHeader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-6xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  PO: {editingPoNumber}
                </h2>
                <p className="text-sm text-slate-500">
                  Edit all items under this purchase order.
                </p>
              </div>

              <button
                type="button"
                onClick={closePoDetails}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 border-b border-slate-200 p-6 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Vendor
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {poHeader.vendor}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Customer
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {poHeader.customer}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Expected Date
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {poHeader.expectedDate}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Total Amount
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  ${poTotalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto p-6">
              <table className="min-w-full border border-slate-200 text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      SKU
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      Item Description
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      Ordered
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      Received
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      Diff
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      Status
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      Invoice#
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {editingRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-slate-200 px-3 py-2">
                        {row.sku}
                      </td>

                      <td className="border border-slate-200 px-3 py-2">
                        {row.itemDescription}
                      </td>

                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          type="number"
                          value={row.ordered}
                          onChange={(e) =>
                            updateEditingRow(
                              row.id,
                              "ordered",
                              Number(e.target.value)
                            )
                          }
                          className="w-24 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>

                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          type="number"
                          value={row.received}
                          onChange={(e) =>
                            updateEditingRow(
                              row.id,
                              "received",
                              Number(e.target.value)
                            )
                          }
                          className="w-24 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>

                      <td className="border border-slate-200 px-3 py-2 text-center">
                        {row.ordered - row.received}
                      </td>

                      <td className="border border-slate-200 px-3 py-2">
                        <select
                          value={row.status}
                          onChange={(e) =>
                            updateEditingRow(row.id, "status", e.target.value)
                          }
                          className="rounded-md border border-slate-300 px-2 py-1"
                        >
                          {statuses.map((statusName) => (
                            <option key={statusName} value={statusName}>
                              {statusName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          value={row.invoiceNumber}
                          onChange={(e) =>
                            updateEditingRow(
                              row.id,
                              "invoiceNumber",
                              e.target.value
                            )
                          }
                          className="w-28 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>

                      <td className="border border-slate-200 px-3 py-2">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) =>
                            updateEditingRow(
                              row.id,
                              "amount",
                              Number(e.target.value)
                            )
                          }
                          className="w-28 rounded-md border border-slate-300 px-2 py-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={copyAllQty}
                className="rounded-xl bg-orange-400 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
              >
                Copy All Qty
              </button>

              <button
                type="button"
                onClick={closePoDetails}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>

              <button
                type="button"
                onClick={savePoDetails}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Save size={16} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Create New Purchase Order
              </h2>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Vendor
                  </label>
                  <select
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                  >
                    {vendors.map((vendorName) => (
                      <option key={vendorName} value={vendorName}>
                        {vendorName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Customer
                  </label>
                  <select
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                  >
                    <option value="Customer 1">Customer 1</option>
                    <option value="Customer 2">Customer 2</option>
                    <option value="Customer 3">Customer 3</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Ship Date
                  </label>
                  <input
                    type="date"
                    value={shipDate}
                    onChange={(e) => setShipDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Ordered Qty
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Delete
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {newRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <input
                            list="item-options"
                            value={row.itemDescription}
                            onChange={(e) =>
                              updateNewRow(
                                row.id,
                                "itemDescription",
                                e.target.value
                              )
                            }
                            placeholder="Type Item 1 to Item 10"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                          />

                          <datalist id="item-options">
                            {items.map((item) => (
                              <option
                                key={item.sku}
                                value={item.itemDescription}
                              />
                            ))}
                          </datalist>
                        </td>

                        <td className="px-4 py-3">{row.sku || "-"}</td>
                        <td className="px-4 py-3">{row.category || "-"}</td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={row.ordered}
                            onChange={(e) =>
                              updateNewRow(
                                row.id,
                                "ordered",
                                Number(e.target.value)
                              )
                            }
                            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) =>
                              updateNewRow(
                                row.id,
                                "amount",
                                Number(e.target.value)
                              )
                            }
                            className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => deleteNewRow(row.id)}
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addNewRow}
                className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Plus size={16} />
                Add Row
              </button>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveNewPurchaseOrder}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Save size={16} />
                Save Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}