"use client";

import { useState } from "react";
import PageTitle from "@/components/PageTitle";

type UserEntry = {
  user: string;
  role: string;
  accessLevel: string;
  status: string;
};

const initialUsers: UserEntry[] = [
  {
    user: "kevin@vidalcoaching.com",
    role: "Admin",
    accessLevel: "Full Access",
    status: "Active",
  },
];

const emptyForm: UserEntry = {
  user: "",
  role: "",
  accessLevel: "",
  status: "Active",
};

export default function UserAccessPage() {
  const [users, setUsers] = useState<UserEntry[]>(initialUsers);
  const [form, setForm] = useState<UserEntry>(emptyForm);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  function resetForm() {
    setForm(emptyForm);
    setEditingUser(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.user.trim()) return;

    if (editingUser) {
      setUsers((prev) =>
        prev.map((entry) =>
          entry.user === editingUser ? { ...form, user: form.user.trim() } : entry
        )
      );
    } else {
      setUsers((prev) => [...prev, { ...form, user: form.user.trim() }]);
    }

    resetForm();
  }

  function handleEdit(entry: UserEntry) {
    setForm(entry);
    setEditingUser(entry.user);
  }

  function handleDelete(user: string) {
    const confirmed = window.confirm(`Delete access for ${user}?`);
    if (!confirmed) return;

    setUsers((prev) => prev.filter((entry) => entry.user !== user));

    if (editingUser === user) {
      resetForm();
    }
  }

  return (
    <section>
      <PageTitle
        title="User Access"
        description="Manage user roles and access permissions for operational modules."
      />

      <article className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">
          {editingUser ? "Edit User Access" : "Add User Access"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={form.user}
              onChange={(e) => setForm({ ...form, user: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="user@email.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Role
            </label>
            <input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Admin, Inventory Manager, Buyer"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Access Level
            </label>
            <select
              value={form.accessLevel}
              onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select access</option>
              <option value="Full Access">Full Access</option>
              <option value="Inventory + Reports">Inventory + Reports</option>
              <option value="Purchase Orders">Purchase Orders</option>
              <option value="Reports Only">Reports Only</option>
              <option value="View Only">View Only</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {editingUser ? "Save Changes" : "Add User"}
            </button>

            {editingUser && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </article>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Access Level</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.map((entry) => (
              <tr key={entry.user}>
                <td className="px-4 py-3 text-slate-700">{entry.user}</td>
                <td className="px-4 py-3 text-slate-700">{entry.role}</td>
                <td className="px-4 py-3 text-slate-700">{entry.accessLevel}</td>
                <td className="px-4 py-3 text-slate-700">{entry.status}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.user)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No users added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}