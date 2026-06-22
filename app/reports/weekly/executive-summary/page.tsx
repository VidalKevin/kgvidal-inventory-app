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

function BlankInput() {
  return (
    <input
      type="text"
      className="h-full w-full border-0 bg-transparent px-1 text-center text-[8px] outline-none"
    />
  );
}

export default function ExecutiveSummaryReportPage() {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

          <button className="h-7 rounded bg-[#10182d] px-4 text-[10px] font-bold text-white">
            Apply Filter
          </button>
        </div>
      </div>

      <div className="w-full bg-white text-black">
        <div className="mb-2 w-[88px] border border-black bg-[#0b3f68] py-1 text-center text-[10px] font-bold text-white">
          Summary
        </div>

        <h2 className="mb-1 text-[16px] font-bold">
          - {lastYear} vs {currentYear} MTD
        </h2>

        <div className="w-full">
          <div className="bg-[#0b3f68] py-1 text-center text-[10px] font-bold text-white">
            Past Year (Current Month) VS Current Year (Current Month) (VL/PD)
          </div>

          <table className="w-full border-collapse text-[8px] leading-tight">
            <thead>
              <tr className="bg-[#d9d9d9]">
                <th className="w-1/2 border border-black py-[1px] text-center">
                  METRIC
                </th>
                <th className="w-1/6 border border-black py-[1px] text-center">
                  Last Year
                </th>
                <th className="w-1/6 border border-black py-[1px] text-center">
                  Current Year
                </th>
                <th className="w-1/6 border border-black py-[1px] text-center">
                  Difference
                </th>
              </tr>
            </thead>

            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row}>
                  <td className="border border-black px-1 py-[1px]">{row}</td>
                  <td className="h-[14px] border border-black">
                    <BlankInput />
                  </td>
                  <td className="h-[14px] border border-black">
                    <BlankInput />
                  </td>
                  <td className="h-[14px] border border-black">
                    <BlankInput />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-4 mb-1 text-[16px] font-bold">
          - TOTAL SHOPIFY GROSS W/Labs
        </h2>

        <div className="w-full">
          <div className="grid grid-cols-[24%_36%_40%] text-[10px] font-bold text-white">
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

          <div className="mt-3 grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(260px,35%)_minmax(420px,1fr)]">
            <table className="w-full border-collapse text-[8px] leading-tight">
              <thead>
                <tr>
                  <th className="w-2/3 border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    VL Current Month | Current Year
                  </th>

                  <th className="w-1/3 border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    MTD
                  </th>
                </tr>
              </thead>

              <tbody>
                {salesRows.map((row) => (
                  <tr key={row}>
                    <td className="border border-black px-1 py-[1px]">{row}</td>
                    <td className="h-[14px] border border-black">
                      <BlankInput />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="w-full border-collapse text-[8px] leading-tight">
              <thead>
                <tr>
                  <th className="w-1/2 border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    VL Current Month | Last Year
                  </th>

                  <th className="w-1/4 border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    MTD
                  </th>

                  <th className="w-1/4 border border-black bg-[#0b3f68] py-[1px] text-center text-white">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {salesRows.map((row) => (
                  <tr key={row}>
                    <td className="border border-black px-1 py-[1px]">{row}</td>
                    <td className="h-[14px] border border-black">
                      <BlankInput />
                    </td>
                    <td className="h-[14px] border border-black">
                      <BlankInput />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          {miniSections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-1 text-[16px] font-bold">
                - {section.title}
              </h2>

              <table className="w-full border-collapse text-[12px] leading-tight">
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
    </section>
  );
}
