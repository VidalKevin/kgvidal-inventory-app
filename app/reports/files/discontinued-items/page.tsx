"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageTitle from "@/components/PageTitle";

type DiscontinuedItem = {
  id: string;
  product_name: string;
  vendor: string;
  sku: string;
  replace_with: string;
  status: string;
};

type DiscontinuedItemsResponse = {
  items: DiscontinuedItem[];
  error?: string;
};

const searchableFields: Array<keyof DiscontinuedItem> = [
  "product_name",
  "vendor",
  "sku",
  "replace_with",
  "status",
];

export default function DiscontinuedItemsPage() {
  const [items, setItems] = useState<DiscontinuedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    fetch("/api/discontinued-items")
      .then(async (response) => {
        const data = (await response.json()) as DiscontinuedItemsResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load discontinued items.");
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
              : "Unable to load discontinued items.";
          setMessage(text);
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

    return items.filter((item) =>
      searchableFields.some((field) =>
        item[field].toLowerCase().includes(query)
      )
    );
  }, [items, search]);

  return (
    <section className="space-y-4">
      <div className="sticky-page-toolbar">
        <PageTitle
          title="Discontinued Items"
          description="Review discontinued SKUs and replacement item notes."
        />

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search discontinued items..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div className="text-xs font-medium text-slate-500">
              {filteredItems.length} of {items.length} items
            </div>
          </div>

          {message && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <thead className="sticky-table-header bg-slate-100 text-slate-700">
              <tr>
                <th className="w-[300px] px-2.5 py-2 text-left font-semibold">
                  Product Name
                </th>
                <th className="w-[170px] px-2.5 py-2 text-left font-semibold">
                  Vendor
                </th>
                <th className="w-[130px] px-2.5 py-2 text-left font-semibold">
                  SKU
                </th>
                <th className="w-[280px] px-2.5 py-2 text-left font-semibold">
                  Replace with
                </th>
                <th className="w-[130px] px-2.5 py-2 text-left font-semibold">
                  Status
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
                    Loading discontinued items...
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
                      <div className="truncate" title={item.product_name}>
                        {item.product_name}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-700">
                      <div className="truncate" title={item.vendor}>
                        {item.vendor}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 font-medium text-slate-700">
                      <div className="truncate" title={item.sku}>
                        {item.sku}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-slate-700">
                      <div className="truncate" title={item.replace_with}>
                        {item.replace_with || "-"}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}

              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No discontinued items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
