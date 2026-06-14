"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Edit3, Plus, Save, Search, Trash2, X } from "lucide-react";
import PageTitle from "@/components/PageTitle";

type PurchaseOrderRow = {
  id?: string;
  date: string;
  mfg: string;
  product_title: string;
  variant_title: string;
  sku: string;
  qty: number;
  qty_received: number;
  diff: number;
  po_number: string;
  status: string;
};

const statuses = ["Pending", "Sent", "Received", "Under Received", "Over Received"];
const receivingStatuses = ["Received", "Under Received", "Over Received"];

function calcDiff(qty: number, qtyReceived: number) {
  return Number(qtyReceived || 0) - Number(qty || 0);
}

function calcStatus(qty: number, qtyReceived: number, fallback = "Pending") {
  if (qtyReceived === qty) return "Received";
  if (qtyReceived < qty) return "Under Received";
  if (qtyReceived > qty) return "Over Received";
  return fallback;
}

export default function PurchaseOrdersPage() {
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [popupOpen, setPopupOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [selectedPo, setSelectedPo] = useState("");
  const [editedPoNumber, setEditedPoNumber] = useState("");
  const [popupRows, setPopupRows] = useState<PurchaseOrderRow[]>([]);
  const [poStatus, setPoStatus] = useState("Pending");

  const loadPurchaseOrders = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/purchase-orders");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load purchase orders.");
      }

      setRows(data.purchaseOrders || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load purchase orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPurchaseOrders();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.date,
        row.mfg,
        row.product_title,
        row.variant_title,
        row.sku,
        row.po_number,
        row.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const openPopup = (poNumber: string) => {
    const samePoRows = rows.filter((row) => row.po_number === poNumber);

    setSelectedPo(poNumber);
    setEditedPoNumber(poNumber);
    setPopupRows(samePoRows);
    setPoStatus(samePoRows[0]?.status || "Pending");
    setPopupMessage("");
    setEditing(false);
    setPopupOpen(true);
  };

  const closePopup = () => {
    setPopupOpen(false);
    setEditing(false);
    setSaving(false);
    setPopupMessage("");
    setSelectedPo("");
    setEditedPoNumber("");
    setPopupRows([]);
  };

  const updatePopupRow = (
    index: number,
    key: keyof PurchaseOrderRow,
    value: string | number
  ) => {
    setPopupRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const next = {
          ...row,
          [key]: value,
        };

        if (key === "qty" || key === "qty_received") {
          next.diff = calcDiff(Number(next.qty || 0), Number(next.qty_received || 0));

          if (receivingStatuses.includes(next.status)) {
            next.status = calcStatus(
              Number(next.qty || 0),
              Number(next.qty_received || 0),
              next.status
            );
          }
        }

        return next;
      })
    );
  };

  const updateAllStatus = (status: string) => {
    setPoStatus(status);

    setPopupRows((current) =>
      current.map((row) => {
        const qty = Number(row.qty || 0);
        const qtyReceived = Number(row.qty_received || 0);

        if (receivingStatuses.includes(status)) {
          return {
            ...row,
            status: calcStatus(qty, qtyReceived, status),
            diff: calcDiff(qty, qtyReceived),
          };
        }

        return {
          ...row,
          status,
        };
      })
    );
  };

  const copyAll = () => {
    setPopupRows((current) =>
      current.map((row) => {
        const qty = Number(row.qty || 0);

        return {
          ...row,
          qty_received: qty,
          diff: 0,
          status: "Received",
        };
      })
    );

    setPoStatus("Received");
  };

  const addPopupRow = () => {
    const base = popupRows[0];
    setPopupRows((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        date: base?.date || new Date().toISOString().slice(0, 10),
        mfg: base?.mfg || "",
        product_title: "",
        variant_title: "Default Title",
        sku: "",
        qty: 0,
        qty_received: 0,
        diff: 0,
        po_number: editedPoNumber || selectedPo,
        status: poStatus || "Pending",
      },
    ]);
    setEditing(true);
  };

  const deletePopupRow = (index: number) => {
    setPopupRows((current) =>
      current.filter((_row, rowIndex) => rowIndex !== index)
    );
    setEditing(true);
  };

  const savePopupRows = async () => {
    const nextPoNumber = editedPoNumber.trim();

    if (!nextPoNumber) {
      setPopupMessage("PO # is required.");
      return;
    }

    for (const row of popupRows) {
      const qty = Number(row.qty || 0);

      if (receivingStatuses.includes(row.status) && !qty) {
        alert("Qty is blank. Cannot update receiving status.");
        return;
      }
    }

    setSaving(true);
    setPopupMessage("");

    try {
      const res = await fetch("/api/purchase-orders/update-po", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalPoNumber: selectedPo,
          poNumber: nextPoNumber,
          rows: popupRows.map((row) => ({
            ...row,
            po_number: nextPoNumber,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error while saving");
      }

      setPopupMessage("Updated successfully");
      setPopupRows(data.purchaseOrders || []);
      setSelectedPo(nextPoNumber);
      setEditedPoNumber(nextPoNumber);
      await loadPurchaseOrders();
      setEditing(false);
    } catch (error) {
      setPopupMessage(
        error instanceof Error ? error.message : "Error while saving"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="sticky-page-toolbar">
        <PageTitle
          title="Purchase Orders"
          description="Track purchase orders, receiving quantities, differences, and status."
        />

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              placeholder="Search PO, vendor, product, SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-xs outline-none focus:border-slate-900"
            />
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-xs">
            <thead className="sticky-table-header bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Vendor</th>
                <th className="px-3 py-2 text-left">Product Title</th>
                <th className="px-3 py-2 text-left">Variant</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-right">Qty.</th>
                <th className="px-3 py-2 text-right">Qty Rcvd.</th>
                <th className="px-3 py-2 text-right">Diff.</th>
                <th className="px-3 py-2 text-left">PO #</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    Loading purchase orders...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRows.map((row, index) => (
                  <tr
                    key={row.id || `${row.po_number}-${index}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-3 py-2">
                      {String(row.date || "").slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">{row.mfg || ""}</td>
                    <td className="px-3 py-2">{row.product_title || ""}</td>
                    <td className="px-3 py-2">{row.variant_title || ""}</td>
                    <td className="px-3 py-2">{row.sku || ""}</td>
                    <td className="px-3 py-2 text-right">{Number(row.qty || 0)}</td>
                    <td className="px-3 py-2 text-right">
                      {Number(row.qty_received || 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(row.diff || 0)}
                    </td>
                    <td className="px-3 py-2">{row.po_number || ""}</td>
                    <td className="px-3 py-2">{row.status || ""}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => openPopup(row.po_number)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No purchase orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Update Purchase Order
                </h2>
                <p className="text-xs text-slate-500">PO #: {editedPoNumber || selectedPo}</p>
              </div>

              <button
                type="button"
                onClick={closePopup}
                className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    PO #
                  </label>
                  <input
                    disabled={!editing}
                    value={editedPoNumber}
                    onChange={(event) => setEditedPoNumber(event.target.value)}
                    className="input w-64"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </label>
                  <select
                    disabled={!editing}
                    value={poStatus}
                    onChange={(event) => updateAllStatus(event.target.value)}
                    className="input w-52"
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={addPopupRow}
                  className="btn-secondary"
                >
                  <Plus size={14} />
                  Add Row
                </button>
              </div>

              {popupMessage && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    popupMessage === "Updated successfully"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {popupMessage}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1050px] text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">Variant Title</th>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Qty Rcvd</th>
                      <th className="px-3 py-2 text-right">Difference</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {popupRows.map((row, index) => (
                      <tr
                        key={row.id || `${row.po_number}-${row.product_title}-${index}`}
                        className="border-t border-slate-100"
                      >
                        <td className="px-3 py-2">
                          <input
                            disabled={!editing}
                            value={row.product_title || ""}
                            onChange={(event) =>
                              updatePopupRow(index, "product_title", event.target.value)
                            }
                            className="input"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            disabled={!editing}
                            value={row.variant_title || ""}
                            onChange={(event) =>
                              updatePopupRow(index, "variant_title", event.target.value)
                            }
                            className="input"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            disabled={!editing}
                            value={row.sku || ""}
                            onChange={(event) =>
                              updatePopupRow(index, "sku", event.target.value)
                            }
                            className="input"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            disabled={!editing}
                            value={Number(row.qty || 0)}
                            onChange={(event) =>
                              updatePopupRow(
                                index,
                                "qty",
                                Number(event.target.value || 0)
                              )
                            }
                            className="input text-right"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            disabled={!editing}
                            value={Number(row.qty_received || 0)}
                            onChange={(event) =>
                              updatePopupRow(
                                index,
                                "qty_received",
                                Number(event.target.value || 0)
                              )
                            }
                            className="input text-right"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            disabled
                            value={Number(row.diff || 0)}
                            className="input text-right"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <select
                            disabled={!editing}
                            value={row.status || "Pending"}
                            onChange={(event) =>
                              updatePopupRow(index, "status", event.target.value)
                            }
                            className="input"
                          >
                            {statuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => deletePopupRow(index)}
                            disabled={!editing}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Delete purchase order row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={copyAll}
                  disabled={!editing}
                  className="btn-secondary disabled:opacity-50"
                >
                  <Copy size={14} />
                  Copy All
                </button>

                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="btn-secondary"
                >
                  <Edit3 size={14} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={savePopupRows}
                  disabled={!editing || saving}
                  className="btn-primary disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save"}
                </button>

                <button type="button" onClick={closePopup} className="btn-secondary">
                  <X size={14} />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
