import PageTitle from "@/components/PageTitle";

const items = [
  {
    sku: "SKU-1001",
    itemName: "Industrial Gloves",
    unit: "Pair",
    category: "Safety",
    reorderLevel: 50,
  },
  {
    sku: "SKU-1123",
    itemName: "Bearing Set",
    unit: "Set",
    category: "Components",
    reorderLevel: 20,
  },
  {
    sku: "SKU-1180",
    itemName: "Packing Tape",
    unit: "Roll",
    category: "Packaging",
    reorderLevel: 100,
  },
];

export default function ItemMasterListPage() {
  return (
    <section>
      <PageTitle
        title="Item Master List"
        description="Define core item data used throughout inventory and purchasing workflows."
      />

      <article className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Master Data Placeholder</h3>
        <p className="mt-2 text-sm text-slate-600">
          Add item setup actions, default pricing, and category assignments here.
        </p>
      </article>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Item Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Unit</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Reorder Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.sku}>
                <td className="px-4 py-3 text-slate-700">{item.sku}</td>
                <td className="px-4 py-3 text-slate-700">{item.itemName}</td>
                <td className="px-4 py-3 text-slate-700">{item.unit}</td>
                <td className="px-4 py-3 text-slate-700">{item.category}</td>
                <td className="px-4 py-3 text-slate-700">{item.reorderLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
