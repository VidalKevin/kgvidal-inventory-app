"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import PageTitle from "@/components/PageTitle";

type ItemMasterRow = {
  id: string;
  product_title: string;
  product_variant_title: string;
  product_variant_sku: string;
  product_vendor: string;
  uom: string;
};

type ItemMasterResponse = {
  items: ItemMasterRow[];
  error?: string;
};

type ItemMasterForm = {
  product_title: string;
  product_variant_title: string;
  product_variant_sku: string;
  product_vendor: string;
  uom: string;
};

const emptyForm: ItemMasterForm = {
  product_title: "",
  product_variant_title: "",
  product_variant_sku: "",
  product_vendor: "",
  uom: "",
};

const fields: Array<{ key: keyof ItemMasterForm; label: string }> = [
  { key: "product_title", label: "Product title" },
  { key: "product_variant_title", label: "Product variant title" },
  { key: "product_variant_sku", label: "Product variant SKU" },
  { key: "product_vendor", label: "Product vendor" },
  { key: "uom", label: "UOM" },
];

export default function ItemMasterListPage() {
  const [items, setItems] = useState<ItemMasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ItemMasterForm>(emptyForm);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    fetch("/api/item-master")
      .then(async (response) => {
        const data = (await response.json()) as ItemMasterResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load item master list.");
        }

        return data.items;
      })
      .then((loadedItems) => {
        if (!ignore) {
          setItems(loadedItems);
        }
      })
      .catch((error) => {
        if (!ignore) {
          const text =
            error instanceof Error
              ? error.message
              : "Unable to load item master list.";
          setMessage({ type: "error", text });
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      return fields.some(({ key }) =>
        item[key].toLowerCase().includes(query)
      );
    });
  }, [items, search]);

  const openAddModal = () => {
    setForm(emptyForm);
    setMessage(null);
    setModalOpen(true);
  };

  const updateForm = (key: keyof ItemMasterForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const addItem = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/item-master", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to add item.");
      }

      setItems((current) => [...current, data.item].sort((a, b) =>
        a.product_title.localeCompare(b.product_title)
      ));
      setModalOpen(false);
      setForm(emptyForm);
      setMessage({ type: "success", text: "Item added to Item Master List." });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to add item.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const formComplete = fields.every(({ key }) => form[key].trim());

  return (
    <section className="space-y-4">
      <div className="sticky-page-toolbar">
        <PageTitle
          title="Item Master List"
          description="Define core item data used throughout inventory and purchasing workflows."
        />

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search product, SKU, vendor..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>

          {message && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <thead className="sticky-table-header bg-slate-100 text-slate-700">
              <tr>
                <th className="w-[270px] px-2.5 py-2 text-left font-semibold">
                  Product title
                </th>
                <th className="w-[170px] px-2.5 py-2 text-left font-semibold">
                  Product variant title
                </th>
                <th className="w-[150px] px-2.5 py-2 text-left font-semibold">
                  Product variant SKU
                </th>
                <th className="w-[170px] px-2.5 py-2 text-left font-semibold">
                  Product vendor
                </th>
                <th className="w-[80px] px-2.5 py-2 text-left font-semibold">
                  UOM
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    Loading item master list...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2.5 py-2.5 text-slate-700">
                      <div className="truncate" title={item.product_title}>
                        {item.product_title}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-700">
                      <div
                        className="truncate"
                        title={item.product_variant_title}
                      >
                        {item.product_variant_title}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 font-medium text-slate-700">
                      <div
                        className="truncate"
                        title={item.product_variant_sku}
                      >
                        {item.product_variant_sku}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-700">
                      <div className="truncate" title={item.product_vendor}>
                        {item.product_vendor}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-700">
                      {item.uom}
                    </td>
                  </tr>
                ))}

              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No item master records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Add Item
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-6">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={(event) =>
                      updateForm(field.key, event.target.value)
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                    required
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addItem}
                disabled={!formComplete || saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
