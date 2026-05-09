import PageTitle from "@/components/PageTitle";

const purchaseOrders = [
  {
    poNumber: "PO-23011",
    vendor: "Prime Industrial Supplies",
    status: "Open",
    expectedDate: "2026-05-18",
  },
  {
    poNumber: "PO-23012",
    vendor: "Metro Hardware Co.",
    status: "Approved",
    expectedDate: "2026-05-21",
  },
  {
    poNumber: "PO-23013",
    vendor: "Northpoint Tools",
    status: "In Transit",
    expectedDate: "2026-05-25",
  },
];

export default function PurchaseOrderPage() {
  return (
    <section>
      <PageTitle
        title="Purchase Order"
        description="Monitor procurement progress and vendor delivery timelines."
      />

      <article className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Purchase Workflow Placeholder</h3>
        <p className="mt-2 text-sm text-slate-600">
          Add approval actions, filters, and PO creation controls in this section.
        </p>
      </article>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">PO Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Vendor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Expected Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchaseOrders.map((order) => (
              <tr key={order.poNumber}>
                <td className="px-4 py-3 text-slate-700">{order.poNumber}</td>
                <td className="px-4 py-3 text-slate-700">{order.vendor}</td>
                <td className="px-4 py-3 text-slate-700">{order.status}</td>
                <td className="px-4 py-3 text-slate-700">{order.expectedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
