"use client";

import { useState } from "react";
import PageTitle from "@/components/PageTitle";

const tabs = ["POs on Hold", "Unfulfilled POs"] as const;

type FulfillmentTab = (typeof tabs)[number];

const rowsByTab: Record<
  FulfillmentTab,
  Array<{
    orderDate: string;
    orderNumber: string;
    firstName: string;
    email: string;
    status: string;
  }>
> = {
  "POs on Hold": [
    {
      orderDate: "2026-06-18",
      orderNumber: "SH-10482",
      firstName: "Claudia",
      email: "claudia@example.com",
      status: "On Hold",
    },
  ],
  "Unfulfilled POs": [
    {
      orderDate: "2026-06-19",
      orderNumber: "SH-10504",
      firstName: "Mendel",
      email: "mendel@example.com",
      status: "Unfulfilled",
    },
  ],
};

export default function FulfillmentPage() {
  const [activeTab, setActiveTab] = useState<FulfillmentTab>("POs on Hold");
  const rows = rowsByTab[activeTab];

  return (
    <section>
      <div className="sticky-page-toolbar">
        <PageTitle
          title="Fulfillment"
          description="Review order holds and unfulfilled purchase order activity."
        />

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky-table-header bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Order Date
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Order Number
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                First Name
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                {activeTab === "POs on Hold" ? "On Hold" : "Status"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${activeTab}-${row.orderNumber}`}>
                <td className="px-4 py-3 text-slate-700">{row.orderDate}</td>
                <td className="px-4 py-3 text-slate-700">{row.orderNumber}</td>
                <td className="px-4 py-3 text-slate-700">{row.firstName}</td>
                <td className="px-4 py-3 text-slate-700">{row.email}</td>
                <td className="px-4 py-3 text-slate-700">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
