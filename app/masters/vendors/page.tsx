import PageTitle from "@/components/PageTitle";

const vendors = [
  {
    vendorName: "Prime Industrial Supplies",
    contactPerson: "Maria Ortega",
    email: "maria@primeindustrial.com",
    phone: "+1-555-0134",
  },
  {
    vendorName: "Metro Hardware Co.",
    contactPerson: "Daniel Kim",
    email: "daniel@metrohardware.com",
    phone: "+1-555-0191",
  },
];

export default function VendorsPage() {
  return (
    <section>
      <PageTitle
        title="Vendors"
        description="Maintain supplier records and contact details for procurement operations."
      />

      <article className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Vendor Management Placeholder</h3>
        <p className="mt-2 text-sm text-slate-600">
          Use this section for vendor onboarding, rating, and performance indicators.
        </p>
      </article>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Vendor Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Contact Person</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.map((vendor) => (
              <tr key={vendor.email}>
                <td className="px-4 py-3 text-slate-700">{vendor.vendorName}</td>
                <td className="px-4 py-3 text-slate-700">{vendor.contactPerson}</td>
                <td className="px-4 py-3 text-slate-700">{vendor.email}</td>
                <td className="px-4 py-3 text-slate-700">{vendor.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
