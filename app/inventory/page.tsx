import PageTitle from "@/components/PageTitle";

const inventoryRows = [
  {
    sku: "SKU-1001",
    itemName: "Industrial Gloves",
    category: "Safety",
    quantity: 240,
    status: "In Stock",
  },
  {
    sku: "SKU-1048",
    itemName: "Hydraulic Oil",
    category: "Lubricants",
    quantity: 32,
    status: "Low Stock",
  },
  {
    sku: "SKU-1123",
    itemName: "Bearing Set",
    category: "Components",
    quantity: 128,
    status: "In Stock",
  },
];

export default function InventoryPage() {
  return (
    <section>
      <PageTitle
        title="Inventory"
        description="Track stock levels, category distribution, and availability status."
      />

      <article className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Inventory Placeholder</h3>
        <p className="mt-2 text-sm text-slate-600">
          Use this card for stock alerts, quick filters, or item search controls.
        </p>
      </article>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Item Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Quantity</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventoryRows.map((row) => (
              <tr key={row.sku}>
                <td className="px-4 py-3 text-slate-700">{row.sku}</td>
                <td className="px-4 py-3 text-slate-700">{row.itemName}</td>
                <td className="px-4 py-3 text-slate-700">{row.category}</td>
                <td className="px-4 py-3 text-slate-700">{row.quantity}</td>
                <td className="px-4 py-3 text-slate-700">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
