import PageTitle from "@/components/PageTitle";

const summaryCards = [
  { label: "Total Inventory Items", value: "1,284" },
  { label: "Low Stock Items", value: "37" },
  { label: "Open Purchase Orders", value: "12" },
  { label: "In-transit Orders", value: "9" },
];

export default function DashboardPage() {
  return (
    <section>
      <PageTitle
        title="Dashboard"
        description="Quick overview of inventory performance and purchasing activity."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Activity Placeholder</h3>
        <p className="mt-2 text-sm text-slate-600">
          Add charts and real-time metrics here once reporting APIs are connected.
        </p>
      </article>
    </section>
  );
}
