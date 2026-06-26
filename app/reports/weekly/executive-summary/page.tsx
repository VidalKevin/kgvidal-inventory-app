"use client";

import { useState } from "react";
import PageTitle from "@/components/PageTitle";

const comparisonRows = [
  "Total Gross (Shopify gross, HC Labs, Dutch Portal)",
  "Shopify Supps",
  "Shopify Labs",
  "HC Sales (Vidal)",
  "AOV (Avg Order Value)",
  "Total Orders (Vidal & PD)",
  "Total Net (Vidal & PD)",
];

const salesRows = [
  "Total Sales:",
  "Shopify Total:",
  "Supp Only Sales:",
  "Shopify Labs:",
  "International Sales:",
  "HC Sales (Refersion):",
  "MMU Sales (Refersion):",
  "HC Labs (Square):",
  "Other Income:",
  "Dutch Portal Airtable",
  "Ave Order:",
  "Total Orders:",
  "Total Net:",
];

const miniSections = [
  {
    title: "BONDI-PURE MTD TOTAL",
    header: "Original and Green Apple\nBondi-Pure VL",
    column: "TOTAL",
    rows: ["Items Sold:", "Gross Sales:"],
  },
  {
    title: "VIDALRX MTD TOTAL (MERCH INCLUDED WITH VL)",
    header: "VL - VidalRx Supps + Vidal Merch",
    column: "MTD",
    rows: ["Net Items Sold:", "Gross Sales:"],
  },
  {
    title: "WEEKLY REDEEMED GIFT CARD VALUE",
    header: "Weekly Redeemed Gift Card Value\nVL",
    column: "MTD",
    rows: ["Gift Card Sales Total:"],
  },
];

type SummaryMetrics = {
  totalSales: number;
  shopifyTotal: number;
  suppOnlySales: number;
  shopifyLabs: number;
  internationalSales: number;
  aveOrder: number;
  totalOrders: number;
  totalNet: number;
};

type ExecutiveSummaryResponse = {
  current: SummaryMetrics;
  previous: SummaryMetrics;
  currentRange: {
    startDate: string;
    endDate: string;
  };
  previousRange: {
    startDate: string;
    endDate: string;
  };
  error?: string;
};

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatValue(row: string, metrics: SummaryMetrics | null) {
  if (!metrics) {
    return "";
  }

  switch (row) {
    case "Total Sales:":
      return formatCurrency(metrics.totalSales);
    case "Shopify Total:":
      return formatCurrency(metrics.shopifyTotal);
    case "Supp Only Sales:":
      return formatCurrency(metrics.suppOnlySales);
    case "Shopify Labs:":
      return formatCurrency(metrics.shopifyLabs);
    case "International Sales:":
      return formatCurrency(metrics.internationalSales);
    case "Ave Order:":
      return formatCurrency(metrics.aveOrder);
    case "Total Orders:":
      return formatNumber(metrics.totalOrders);
    case "Total Net:":
      return formatCurrency(metrics.totalNet);
    default:
      return "";
  }
}

function getMetricValue(row: string, metrics: SummaryMetrics | null) {
  if (!metrics) {
    return null;
  }

  switch (row) {
    case "Total Gross (Shopify gross, HC Labs, Dutch Portal)":
      return metrics.shopifyTotal;
    case "Shopify Supps":
      return metrics.suppOnlySales;
    case "Shopify Labs":
      return metrics.shopifyLabs;
    case "AOV (Avg Order Value)":
      return metrics.aveOrder;
    case "Total Orders (Vidal & PD)":
      return metrics.totalOrders;
    case "Total Net (Vidal & PD)":
      return metrics.totalNet;
    default:
      return null;
  }
}

function formatComparisonValue(row: string, value: number | null) {
  if (value == null) {
    return "";
  }

  if (row === "Total Orders (Vidal & PD)") {
    return formatNumber(value);
  }

  return formatCurrency(value);
}

function monthYearLabel(dateValue: string) {
  if (!dateValue) {
    return "Current Month";
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function defaultDateInput(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ExecutiveSummaryReportPage() {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const [startDate, setStartDate] = useState(defaultDateInput(25));
  const [endDate, setEndDate] = useState(defaultDateInput(0));
  const [summary, setSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentLabel = monthYearLabel(summary?.currentRange.startDate ?? startDate);
  const previousLabel = monthYearLabel(
    summary?.previousRange.startDate ??
      `${Number(startDate.slice(0, 4)) - 1}${startDate.slice(4)}`
  );

  const loadSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(
        `/api/reports/executive-summary?${params.toString()}`
      );
      const data = (await response.json()) as ExecutiveSummaryResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to load executive summary.");
      }

      setSummary(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load executive summary.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full">
      <PageTitle
        title="Executive Summary Report"
        description="Review sales, Shopify, Labs, and fulfillment performance."
      />

      <div className="mb-3 w-full rounded border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] text-slate-700">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-7 w-[98px] rounded border border-slate-300 px-2 text-[10px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] text-slate-700">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-7 w-[98px] rounded border border-slate-300 px-2 text-[10px]"
            />
          </div>

          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="h-7 rounded bg-[#10182d] px-4 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading..." : "Apply Filter"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="w-full overflow-x-auto bg-white text-black">
        <div className="origin-top-left min-[1500px]:[zoom:1.55] min-[1800px]:[zoom:1.9] min-[2100px]:[zoom:2.2]">
        <div className="mb-2 w-[88px] border border-black bg-[#0b3f68] py-1 text-center text-[10px] font-bold text-white">
          Summary
        </div>

        <h2 className="mb-1 text-[16px] font-bold">
          - {lastYear} vs {currentYear} MTD
        </h2>

        <div className="w-[512px]">
          <div className="bg-[#0b3f68] py-1 text-center text-[10px] font-bold text-white">
            Past Year (Current Month) VS Current Year (Current Month) (VL/PD)
          </div>

          <table className="w-full border-collapse text-[8px] leading-tight">
            <thead>
              <tr className="bg-[#d9d9d9]">
                <th className="w-[250px] border border-black py-[1px] text-center">
                  METRIC
                </th>
                <th className="w-[76px] border border-black py-[1px] text-center">
                  Last Year
                </th>
                <th className="w-[94px] border border-black py-[1px] text-center">
                  Current Year
                </th>
                <th className="w-[92px] border border-black py-[1px] text-center">
                  Difference
                </th>
              </tr>
            </thead>

            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row}>
                  <td className="border border-black px-1 py-[1px]">{row}</td>
                  <td className="h-[14px] border border-black">
                    {formatComparisonValue(
                      row,
                      getMetricValue(row, summary?.previous ?? null)
                    )}
                  </td>
                  <td className="h-[14px] border border-black">
                    {formatComparisonValue(
                      row,
                      getMetricValue(row, summary?.current ?? null)
                    )}
                  </td>
                  <td className="h-[14px] border border-black">
                    {(() => {
                      const current = getMetricValue(
                        row,
                        summary?.current ?? null
                      );
                      const previous = getMetricValue(
                        row,
                        summary?.previous ?? null
                      );

                      return current == null || previous == null
                        ? ""
                        : formatComparisonValue(row, current - previous);
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-4 mb-1 text-[16px] font-bold">
          - TOTAL SHOPIFY GROSS W/Labs
        </h2>

        <div className="w-[730px]">
          <div className="grid grid-cols-[175px_255px_300px] text-[10px] font-bold text-white">
            <div className="border border-black bg-[#0b3f68] py-1 text-center">
              Summary
            </div>

            <div className="border border-black bg-[#0b3f68] py-1 text-center">
              Supplements | Labs Update
            </div>

            <div className="border border-black bg-[#0b3f68] py-1 text-center">
              VL(ND) | PD
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between">
            <table className="border-collapse text-[8px] leading-tight">
              <thead>
                <tr>
                  <th className="w-[175px] border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    VL {currentLabel}
                  </th>

                  <th className="w-[85px] border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    MTD
                  </th>
                </tr>
              </thead>

              <tbody>
                {salesRows.map((row) => (
                  <tr key={row}>
                    <td className="border border-black px-1 py-[1px]">{row}</td>
                    <td className="h-[14px] border border-black">
                      {formatValue(row, summary?.current ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="border-collapse text-[8px] leading-tight">
              <thead>
                <tr>
                  <th className="w-[215px] border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    VL {previousLabel}
                  </th>

                  <th className="w-[75px] border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    MTD
                  </th>

                  <th className="w-[85px] border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {salesRows.map((row) => (
                  <tr key={row}>
                    <td className="border border-black px-1 py-[1px]">{row}</td>
                    <td className="h-[14px] border border-black">
                      {formatValue(row, summary?.previous ?? null)}
                    </td>
                    <td className="h-[14px] border border-black">
                      {formatValue(row, summary?.previous ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {miniSections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-1 text-[16px] font-bold">
                - {section.title}
              </h2>

              <table className="w-[348px] border-collapse text-[12px] leading-tight">
                <thead>
                  <tr>
                    <th className="w-[232px] whitespace-pre-line border border-black bg-black px-1 py-1 text-center font-bold text-white">
                      {section.header}
                    </th>
                    <th className="w-[116px] border border-black bg-[#b7d3d7] px-1 py-1 text-center font-bold text-black">
                      {section.column}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row}>
                      <td className="border border-black bg-[#cfcfcf] px-1 py-[2px] text-center font-bold">
                        {row}
                      </td>
                      <td className="h-[21px] border border-black bg-white">
                        <input
                          type="text"
                          className="h-full w-full border-0 bg-transparent px-1 text-center text-[12px] outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
