"use client";

import { useMemo, useState } from "react";
import PageTitle from "@/components/PageTitle";

type Summary = {
  grossSales: number;
  totalOrders: number;
  averageOrderValue: number;
  giftCardsRedeemed: number;
  internationalGrossSales: number;
  vendorGrossSales: number;
};

type ProductTypeRow = {
  productType: string;
  grossSales: number;
};

type ProductRow = {
  productTitle: string;
  sku: string;
  quantitySold: number;
  orderCount: number;
  grossSales: number;
};

type VendorRow = {
  vendor: string;
  grossSales: number;
};

type CountryRow = {
  shippingCountry: string;
  grossSales: number;
  orderCount: number;
};

type SyncStateRow = {
  sync_type: string;
  last_synced_at: string | null;
  status: string | null;
  message: string | null;
  updated_at: string | null;
};

const PRODUCT_TYPES = ["", "Lab Test Public", "Nutraceutical", "Nutraceuticals"];

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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-slate-500">
        No data for the selected filters.
      </td>
    </tr>
  );
}

export default function PdAnalyticsPage() {
  const [startDate, setStartDate] = useState(dateInputDaysAgo(30));
  const [endDate, setEndDate] = useState(dateInputDaysAgo(0));
  const [productType, setProductType] = useState("");
  const [vendor, setVendor] = useState("");
  const [search, setSearch] = useState("");
  const [internationalOnly, setInternationalOnly] = useState(false);
  const [vendors, setVendors] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendorRows, setVendorRows] = useState<VendorRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [syncState, setSyncState] = useState<SyncStateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      internationalOnly: String(internationalOnly),
    });

    if (productType) params.set("productType", productType);
    if (vendor) params.set("vendor", vendor);
    if (search.trim()) params.set("search", search.trim());

    return params.toString();
  }, [endDate, internationalOnly, productType, search, startDate, vendor]);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, productsResponse, vendorsResponse, countriesResponse, statusResponse] =
        await Promise.all([
          fetch(`/api/pd-analytics/summary?${queryString}`, { cache: "no-store" }),
          fetch(`/api/pd-analytics/products?${queryString}`, { cache: "no-store" }),
          fetch(`/api/pd-analytics/vendors?${queryString}`, { cache: "no-store" }),
          fetch(`/api/pd-analytics/countries?${queryString}`, { cache: "no-store" }),
          fetch("/api/pd-analytics/sync-status", { cache: "no-store" }),
        ]);

      const summaryData = await summaryResponse.json();
      const productsData = await productsResponse.json();
      const vendorsData = await vendorsResponse.json();
      const countriesData = await countriesResponse.json();
      const statusData = await statusResponse.json();

      for (const data of [
        summaryData,
        productsData,
        vendorsData,
        countriesData,
        statusData,
      ]) {
        if (data.error) {
          throw new Error(data.error);
        }
      }

      setSummary(summaryData.summary);
      setProductTypes(productsData.byProductType ?? []);
      setProducts(productsData.byProduct ?? []);
      setVendors(vendorsData.vendors ?? []);
      setVendorRows(vendorsData.rows ?? []);
      setCountries(countriesData.rows ?? []);
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

  const cards = [
    ["Gross Sales", formatCurrency(summary?.grossSales)],
    ["Orders", formatNumber(summary?.totalOrders)],
    ["Average Order Value", formatCurrency(summary?.averageOrderValue)],
    ["Gift Cards Redeemed", formatCurrency(summary?.giftCardsRedeemed)],
    ["International Gross Sales", formatCurrency(summary?.internationalGrossSales)],
    ["Vendor Gross Sales", formatCurrency(summary?.vendorGrossSales)],
  ];

  return (
    <section className="w-full">
      <PageTitle
        title="PD Analytics"
        description="Practitioner Depot Shopify reporting preserved from the dedicated PD data set."
      />

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-medium text-slate-700">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-slate-700">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-slate-700">
            Product type
            <select
              value={productType}
              onChange={(event) => setProductType(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            >
              {PRODUCT_TYPES.map((value) => (
                <option key={value || "all"} value={value}>
                  {value || "All product types"}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-700">
            Vendor
            <select
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">All vendors</option>
              {vendors.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-700">
            SKU/Product
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SKU or product"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>

          <div className="flex items-end gap-2">
            <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={internationalOnly}
                onChange={(event) => setInternationalOnly(event.target.checked)}
              />
              International
            </label>
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="h-9 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Apply"}
            </button>
          </div>
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

      <div className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
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
              {productTypes.length === 0 ? (
                <EmptyRow colSpan={2} />
              ) : (
                productTypes.map((row) => (
                  <tr key={row.productType}>
                    <td className="px-4 py-2">{row.productType}</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(row.grossSales)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableShell>

        <TableShell title="Sales by Product/SKU">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2 text-right">Qty Sold</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2 text-right">Gross Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                products.map((row) => (
                  <tr key={`${row.sku}-${row.productTitle}`}>
                    <td className="px-4 py-2">{row.productTitle}</td>
                    <td className="px-4 py-2">{row.sku || "-"}</td>
                    <td className="px-4 py-2 text-right">
                      {formatNumber(row.quantitySold)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatNumber(row.orderCount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(row.grossSales)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableShell>

        <div className="grid gap-5 xl:grid-cols-2">
          <TableShell title="Sales by Vendor">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2">Vendor</th>
                  <th className="px-4 py-2 text-right">Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorRows.length === 0 ? (
                  <EmptyRow colSpan={2} />
                ) : (
                  vendorRows.map((row) => (
                    <tr key={row.vendor}>
                      <td className="px-4 py-2">{row.vendor}</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(row.grossSales)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableShell>

          <TableShell title="International Gross Sales by Country">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2">Country</th>
                  <th className="px-4 py-2 text-right">Orders</th>
                  <th className="px-4 py-2 text-right">Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {countries.length === 0 ? (
                  <EmptyRow colSpan={3} />
                ) : (
                  countries.map((row) => (
                    <tr key={row.shippingCountry}>
                      <td className="px-4 py-2">{row.shippingCountry}</td>
                      <td className="px-4 py-2 text-right">
                        {formatNumber(row.orderCount)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(row.grossSales)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableShell>
        </div>
      </div>
    </section>
  );
}
