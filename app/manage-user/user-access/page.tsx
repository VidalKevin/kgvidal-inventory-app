import PageTitle from "@/components/PageTitle";

const users = [
  {
    user: "admin@kginventory.com",
    role: "Administrator",
    accessLevel: "Full Access",
    status: "Active",
  },
  {
    user: "inventory.lead@kginventory.com",
    role: "Inventory Manager",
    accessLevel: "Inventory + Reports",
    status: "Active",
  },
  {
    user: "buyer@kginventory.com",
    role: "Procurement Officer",
    accessLevel: "Purchase Orders",
    status: "Pending",
  },
];

export default function UserAccessPage() {
  return (
    <section>
      <PageTitle
        title="User Access"
        description="Manage user roles and access permissions for operational modules."
      />

      <article className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Access Control Placeholder</h3>
        <p className="mt-2 text-sm text-slate-600">
          Add invite actions, role templates, and security audit details here.
        </p>
      </article>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Access Level</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((entry) => (
              <tr key={entry.user}>
                <td className="px-4 py-3 text-slate-700">{entry.user}</td>
                <td className="px-4 py-3 text-slate-700">{entry.role}</td>
                <td className="px-4 py-3 text-slate-700">{entry.accessLevel}</td>
                <td className="px-4 py-3 text-slate-700">{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
