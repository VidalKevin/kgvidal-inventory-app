"use client";

import { useState } from "react";
import PageTitle from "@/components/PageTitle";

export default function ExecutiveSummaryReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <section className="space-y-6">
      <PageTitle
        title="Executive Summary Report"
        description="Review sales, Shopify, Labs, and fulfillment performance."
      />

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Apply Filter
          </button>

          <div className="ml-auto flex gap-2">
            <button className="rounded border px-3 py-2 text-sm">
              MTD
            </button>
            <button className="rounded border px-3 py-2 text-sm">
              Last Month
            </button>
            <button className="rounded border px-3 py-2 text-sm">
              YTD
            </button>
          </div>
        </div>
      </div>

      {/* 2025 vs 2026 */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 text-white font-semibold">
          2025 vs 2026 MTD
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left">Metric</th>
              <th className="border p-2">2025</th>
              <th className="border p-2">2026</th>
              <th className="border p-2">Difference</th>
            </tr>
          </thead>

          <tbody>
            {[
              "Total Gross",
              "Shopify Supps",
              "Shopify Labs",
              "HC Sales (Vidal)",
              "AOV",
              "Total Orders",
              "Total Net",
            ].map((metric) => (
              <tr key={metric}>
                <td className="border p-2">{metric}</td>
                <td className="border p-2 text-center"></td>
                <td className="border p-2 text-center"></td>
                <td className="border p-2 text-center"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shopify Gross */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 text-white font-semibold">
          Total Shopify Gross w/Labs
        </div>

        <div className="grid gap-6 p-4 lg:grid-cols-2">
          {/* Current */}
          <div>
            <div className="mb-3 rounded bg-slate-100 px-3 py-2 font-semibold">
              Current Period
            </div>

            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  "Total Sales",
                  "Shopify Total",
                  "Supp Only Sales",
                  "Shopify Labs",
                  "International Sales",
                  "HC Sales",
                  "MMU Sales",
                  "HC Labs",
                  "Other Income",
                  "Dutch Portal",
                  "Ave Order",
                  "Total Orders",
                  "Total Net",
                ].map((item) => (
                  <tr key={item}>
                    <td className="border p-2">{item}</td>
                    <td className="border p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comparison */}
          <div>
            <div className="mb-3 rounded bg-slate-100 px-3 py-2 font-semibold">
              Comparison Period
            </div>

            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  "Total Sales",
                  "Shopify Total",
                  "Supp Only Sales",
                  "Shopify Labs",
                  "International Sales",
                  "HC Sales",
                  "MMU Sales",
                  "HC Labs",
                  "Other Income",
                  "Dutch Portal",
                  "Ave Order",
                  "Total Orders",
                  "Total Net",
                ].map((item) => (
                  <tr key={item}>
                    <td className="border p-2">{item}</td>
                    <td className="border p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}