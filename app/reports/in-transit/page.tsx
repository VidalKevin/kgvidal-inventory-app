import PageTitle from "@/components/PageTitle";

const inTransitRows = [
  {
    shipmentId: "SHP-8910",
    poNumber: "PO-23013",
    vendor: "Northpoint Tools",
    eta: "2026-05-25",
    status: "On Route",
  },
  {
    shipmentId: "SHP-8912",
    poNumber: "PO-23015",
    vendor: "Metro Hardware Co.",
    eta: "2026-05-27",
    status: "Customs Clearance",
  },
];

export default function InTransitReportPage() {
  return (
    <section>
      <div className="sticky-page-toolbar">
        <PageTitle
          title="In-transit Report"
          description="Review open incoming shipments and their expected delivery dates."
        />

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Report Placeholder</h3>
          <p className="mt-2 text-sm text-slate-600">
            Connect report filters and export controls here for logistics monitoring.
          </p>
        </article>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky-table-header bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Shipment ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">PO Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Vendor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">ETA</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inTransitRows.map((row) => (
              <tr key={row.shipmentId}>
                <td className="px-4 py-3 text-slate-700">{row.shipmentId}</td>
                <td className="px-4 py-3 text-slate-700">{row.poNumber}</td>
                <td className="px-4 py-3 text-slate-700">{row.vendor}</td>
                <td className="px-4 py-3 text-slate-700">{row.eta}</td>
                <td className="px-4 py-3 text-slate-700">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
