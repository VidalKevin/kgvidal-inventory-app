import PageTitle from "@/components/PageTitle";

const customers = [
  {
    customerName: "Atlas Retail Group",
    contactPerson: "Jenna Hall",
    email: "jenna@atlasretail.com",
    phone: "+1-555-0118",
  },
  {
    customerName: "Vertex Distribution",
    contactPerson: "Omar Khan",
    email: "omar@vertexdist.com",
    phone: "+1-555-0172",
  },
];

export default function CustomersPage() {
  return (
    <section>
      <PageTitle
        title="Customers"
        description="Track customer master data and communication points."
      />

      <article className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Customer Records Placeholder</h3>
        <p className="mt-2 text-sm text-slate-600">
          Add customer segmentation, terms, and account insights here.
        </p>
      </article>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Customer Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Contact Person</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <tr key={customer.email}>
                <td className="px-4 py-3 text-slate-700">{customer.customerName}</td>
                <td className="px-4 py-3 text-slate-700">{customer.contactPerson}</td>
                <td className="px-4 py-3 text-slate-700">{customer.email}</td>
                <td className="px-4 py-3 text-slate-700">{customer.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
