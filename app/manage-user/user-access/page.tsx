"use client";

import { useEffect, useState } from "react";
import PageTitle from "@/components/PageTitle";

type UserEntry = {
  id: string;
  email: string;
  username: string;
  role: string;
  accessLevel: string;
  status: string;
};

type UserForm = Omit<UserEntry, "id"> & {
  password: string;
};

const emptyForm: UserForm = {
  email: "",
  username: "",
  role: "",
  accessLevel: "",
  status: "Active",
  password: "",
};

export default function UserAccessPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<UserEntry | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const data = (await response.json()) as {
        users?: UserEntry[];
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to load users.");
      }

      setUsers(data.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingUser(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        editingUser ? `/api/users/${editingUser.id}` : "/api/users",
        {
          method: editingUser ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to save user.");
      }

      setMessage(editingUser ? "User updated." : "User added.");
      resetForm();
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save user.");
    }
  }

  function handleEdit(entry: UserEntry) {
    setForm({ ...entry, password: "" });
    setEditingUser(entry);
  }

  async function handleDelete(entry: UserEntry) {
    const confirmed = window.confirm(`Delete access for ${entry.email}?`);
    if (!confirmed) return;
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/users/${entry.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to delete user.");
      }

      setMessage("User deleted.");
      await loadUsers();

      if (editingUser?.id === entry.id) {
        resetForm();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete user."
      );
    }
  }

  return (
    <section>
      <div className="sticky-page-toolbar">
        <PageTitle
          title="User Access"
          description="Manage app logins, roles, and password resets."
        />

        {error ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            {editingUser ? "Edit User Access" : "Add User Access"}
          </h3>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="kevin"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                Temporary / New Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder={editingUser ? "Leave blank to keep current password" : "10+ characters"}
                required={!editingUser}
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
                {editingUser ? "Save / Reset Password" : "Add User"}
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
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky-table-header bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Access Level</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 text-slate-700">{entry.username}</td>
                <td className="px-4 py-3 text-slate-700">{entry.email}</td>
                <td className="px-4 py-3 text-slate-700">{entry.role}</td>
                <td className="px-4 py-3 text-slate-700">{entry.accessLevel}</td>
                <td className="px-4 py-3 text-slate-700">{entry.status}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit / Reset
                    </button>
                    <button
                      onClick={() => void handleDelete(entry)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No users added yet.
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Loading users...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
