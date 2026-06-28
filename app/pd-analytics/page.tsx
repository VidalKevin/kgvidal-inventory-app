"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import PageTitle from "@/components/PageTitle";

type Summary = {
  grossSales: number;
  netSales: number;
  totalOrders: number;
  averageOrderValue: number;
  giftCardsRedeemed: number;
  internationalGrossSales: number;
  vidalGrossSales?: number;
  vendorGrossSales?: number;
};

type ProductTypeRow = {
  productType: string;
  grossSales: number;
};

type ProductRow = {
  productTitle: string;
  sku: string;
  vendor?: string;
  quantitySold: number;
  orderCount: number;
  grossSales: number;
};

type SyncStateRow = {
  sync_type: string;
  last_synced_at: string | null;
  status: string | null;
  message: string | null;
  updated_at: string | null;
};

type ActiveTab = "summary" | "variants";

function dateInputDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function TableShell({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {right}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-slate-500">
        No data for the selected date range.
      </td>
    </tr>
  );
}

function getProductTypeSales(rows: ProductTypeRow[], productType: string) {
  const normalized = productType.toLowerCase();
  return rows
    .filter((row) => row.productType.toLowerCase() === normalized)
    .reduce((total, row) => total + row.grossSales, 0);
}

function getBondiSales(rows: ProductRow[]) {
  let greenApple = 0;
  let original = 0;

  for (const row of rows) {
    const title = row.productTitle.toLowerCase();
    const sku = row.sku.toLowerCase();

    if (!title.includes("bondi") && !sku.includes("bondi")) {
      continue;
    }

    if (title.includes("green apple") || sku.includes("bondipure-2")) {
      greenApple += row.grossSales;
    } else if (
      title.includes("original") ||
      title.includes("blood orange") ||
      sku === "bondipure"
    ) {
      original += row.grossSales;
    }
  }

  return {
    greenApple,
    original,
    total: greenApple + original,
  };
}

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function PdAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
  const [startDate, setStartDate] = useState(dateInputDaysAgo(30));
  const [endDate, setEndDate] = useState(dateInputDaysAgo(0));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [syncState, setSyncState] = useState<SyncStateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    return new URLSearchParams({ startDate, endDate }).toString();
  }, [endDate, startDate]);

  const suppOnlySales =
    getProductTypeSales(productTypes, "Nutraceutical") +
    getProductTypeSales(productTypes, "Nutraceuticals");
  const bondiSales = getBondiSales(products);
  const variantRows = products.map((row) => ({
    productTitle: row.productTitle,
    variantTitle: "Default Title",
    sku: row.sku,
    mfg: row.vendor ?? "",
    currentQty: row.quantitySold,
  }));

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, productsResponse, statusResponse] = await Promise.all([
        fetch(`/api/pd-analytics/summary?${queryString}`, { cache: "no-store" }),
        fetch(`/api/pd-analytics/products?${queryString}`, { cache: "no-store" }),
        fetch("/api/pd-analytics/sync-status", { cache: "no-store" }),
      ]);

      const summaryData = await summaryResponse.json();
      const productsData = await productsResponse.json();
      const statusData = await statusResponse.json();

      for (const data of [summaryData, productsData, statusData]) {
        if (data.error) {
          throw new Error(data.error);
        }
      }

      setSummary(summaryData.summary);
      setProductTypes(productsData.byProductType ?? []);
      setProducts(productsData.byProduct ?? []);
      setSyncState(statusData.syncState ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load PD Analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadVariants() {
    const headers = [
      "PRODUCT TITLE",
      "VARIANT TITLE",
      "SKU",
      "MFG",
      "CURRENT QTY",
    ];
    const lines = [
      headers.map(escapeCsv).join(","),
      ...variantRows.map((row) =>
        [
          row.productTitle,
          row.variantTitle,
          row.sku,
          row.mfg,
          row.currentQty,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pd-sales-by-variant-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const cards = [
    ["Gross Sales", formatCurrency(summary?.grossSales)],
    ["Net Sales", formatCurrency(summary?.netSales)],
    ["Orders", formatNumber(summary?.totalOrders)],
    ["Average Order Value", formatCurrency(summary?.averageOrderValue)],
    ["Gift Cards Redeemed", formatCurrency(summary?.giftCardsRedeemed)],
    ["International Gross Sales", formatCurrency(summary?.internationalGrossSales)],
    ["Vidal Gross Sales", formatCurrency(summary?.vidalGrossSales ?? summary?.vendorGrossSales)],
  ];

  return (
    <section className="w-full">
      <PageTitle
        title="PD Analytics"
        description="Practitioner Depot Shopify reporting preserved from the dedicated PD data set."
      />

      <div className="mb-4 flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activeTab === "summary"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          PD Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("variants")}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activeTab === "variants"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Sales by Variant
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-700">
            From
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 h-9 w-40 rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-slate-700">
            To
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 h-9 w-40 rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="h-9 rounded-md bg-slate-900 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {syncState.length > 0 ? (
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Last sync: {syncState[0].status || "unknown"} -{" "}
          {syncState[0].message || "No message"}
        </div>
      ) : null}

      {activeTab === "summary" ? (
        <>
          <div className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {cards.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5">
            <TableShell title="Sales by Product Type">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Product Type</th>
                    <th className="px-4 py-2 text-right">Gross Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2">Lab Test Public</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(getProductTypeSales(productTypes, "Lab Test Public"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-semibold">Supp Only Sales</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCurrency(suppOnlySales)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 pl-14 text-slate-600">Nutraceutical</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(getProductTypeSales(productTypes, "Nutraceutical"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 pl-14 text-slate-600">Nutraceuticals</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(getProductTypeSales(productTypes, "Nutraceuticals"))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </TableShell>

            <TableShell title="Bondi Pure Sales">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Flavor</th>
                    <th className="px-4 py-2 text-right">Gross Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2 font-semibold">
                      Bondi Pure Sales
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCurrency(bondiSales.total)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 pl-14 text-slate-600">Green Apple</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(bondiSales.greenApple)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 pl-14 text-slate-600">
                      Original (Blood Orange)
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(bondiSales.original)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </TableShell>
          </div>
        </>
      ) : (
        <TableShell
          title="Sales by Variant"
          right={
            <button
              type="button"
              onClick={downloadVariants}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              title="Download to Excel"
            >
              <Download size={15} />
              Download
            </button>
          }
        >
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2">Product Title</th>
                <th className="px-4 py-2">Variant Title</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">MFG</th>
                <th className="px-4 py-2 text-right">Current Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variantRows.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                variantRows.map((row) => (
                  <tr key={`${row.sku}-${row.productTitle}`}>
                    <td className="px-4 py-2">{row.productTitle}</td>
                    <td className="px-4 py-2">{row.variantTitle}</td>
                    <td className="px-4 py-2">{row.sku || "-"}</td>
                    <td className="px-4 py-2">{row.mfg || "-"}</td>
                    <td className="px-4 py-2 text-right">
                      {formatNumber(row.currentQty)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableShell>
      )}
    </section>
  );
}
