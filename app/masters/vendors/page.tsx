"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Contact,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import PageTitle from "@/components/PageTitle";

type VendorRow = {
  id: string;
  mfg: string;
  code: string;
  lead_time: string;
  review_period: string;
  order_at: string;
  link: string;
  username: string;
  password: string;
  contact: string;
  email: string;
  phone: string;
};

type VendorResponse = {
  vendors: VendorRow[];
  error?: string;
};

type VendorForm = Omit<VendorRow, "id">;

type DetailModal =
  | {
      title: string;
      rows: Array<{ label: string; value: string }>;
    }
  | null;

const emptyForm: VendorForm = {
  mfg: "",
  code: "",
  lead_time: "",
  review_period: "",
  order_at: "",
  link: "",
  username: "",
  password: "",
  contact: "",
  email: "",
  phone: "",
};

const fields: Array<{ key: keyof VendorForm; label: string }> = [
  { key: "mfg", label: "MFG" },
  { key: "code", label: "Code" },
  { key: "lead_time", label: "LEAD TIME" },
  { key: "review_period", label: "REVIEW PERIOD" },
  { key: "order_at", label: "Order at" },
  { key: "link", label: "Link" },
  { key: "username", label: "Username" },
  { key: "password", label: "Password" },
  { key: "contact", label: "Contact" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

function getUniqueOptions(
  vendors: VendorRow[],
  key: keyof Pick<VendorRow, "lead_time" | "review_period" | "order_at">
) {
  return Array.from(
    new Set(
      vendors
        .map((vendor) => String(vendor[key] || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModal>(null);
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    let ignore = false;

    fetch("/api/vendor-list")
      .then(async (response) => {
        const data = (await response.json()) as VendorResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load vendor list.");
        }

        return data.vendors || [];
      })
      .then((loadedVendors) => {
        if (!ignore) {
          setVendors(
            loadedVendors.map((vendor) => ({
              ...vendor,
              code: vendor.code || "",
            }))
          );
        }
      })
      .catch((error) => {
        if (!ignore) {
          setMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load vendor list.",
          });
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const leadTimeOptions = useMemo(
    () => getUniqueOptions(vendors, "lead_time"),
    [vendors]
  );

  const reviewPeriodOptions = useMemo(
    () => getUniqueOptions(vendors, "review_period"),
    [vendors]
  );

  const orderAtOptions = useMemo(
    () => getUniqueOptions(vendors, "order_at"),
    [vendors]
  );

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return vendors;

    return vendors.filter((vendor) =>
      fields.some(({ key }) =>
        String(vendor[key] || "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [vendors, search]);

  const openAddModal = () => {
    setForm(emptyForm);
    setMessage(null);
    setModalOpen(true);
  };

  const updateForm = (key: keyof VendorForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const addVendor = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/vendor-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to add vendor.");
      }

      const addedVendor = {
        ...data.vendor,
        code: data.vendor?.code || form.code || "",
      };

      setVendors((current) =>
        [...current, addedVendor].sort((a, b) => a.mfg.localeCompare(b.mfg))
      );

      setModalOpen(false);
      setForm(emptyForm);
      setMessage({ type: "success", text: "Vendor added to Vendors List." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to add vendor.",
      });
    } finally {
      setSaving(false);
    }
  };

  const formComplete = fields.every(({ key }) => form[key].trim());

  const openOrderAction = (vendor: VendorRow) => {
    if (String(vendor.order_at || "").toLowerCase().includes("website")) {
      const href = vendor.link?.startsWith("http")
        ? vendor.link
        : `https://${vendor.link}`;

      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    setDetailModal({
      title: "Email Order Details",
      rows: [
        { label: "Name", value: vendor.contact },
        { label: "Email Address", value: vendor.email || vendor.link },
      ],
    });
  };

  const openContactDetails = (vendor: VendorRow) => {
    setDetailModal({
      title: "Contact Details",
      rows: [
        { label: "Contact", value: vendor.contact },
        { label: "Email", value: vendor.email },
        { label: "Number", value: vendor.phone },
      ],
    });
  };

  const openMissingIdMessage = () => {
    setMessage({
      type: "error",
      text: "This vendor is missing an ID.",
    });
  };

  return (
    <section className="space-y-4">
      <div className="sticky-page-toolbar">
        <PageTitle
          title="Vendors List"
          description="Maintain supplier records, ordering details, and contact information."
        />

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search vendor, code, email, contact..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={14} />
              Add Vendor
            </button>
          </div>

          {message && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <thead className="sticky-table-header bg-slate-100 text-slate-700">
              <tr>
                <th className="w-[170px] px-2.5 py-2 text-left font-semibold">
                  MFG
                </th>
                <th className="w-[120px] px-2.5 py-2 text-left font-semibold">
                  Code
                </th>
                <th className="w-[140px] px-2.5 py-2 text-left font-semibold">
                  LEAD TIME
                </th>
                <th className="w-[130px] px-2.5 py-2 text-left font-semibold">
                  REVIEW PERIOD
                </th>
                <th className="w-[90px] px-2.5 py-2 text-center font-semibold">
                  Order at
                </th>
                <th className="w-[150px] px-2.5 py-2 text-left font-semibold">
                  Username
                </th>
                <th className="w-[130px] px-2.5 py-2 text-left font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => setShowPasswords((current) => !current)}
                      title={showPasswords ? "Hide passwords" : "Show passwords"}
                      aria-label={
                        showPasswords ? "Hide passwords" : "Show passwords"
                      }
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200"
                    >
                      {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </th>
                <th className="w-[90px] px-2.5 py-2 text-center font-semibold">
                  Contact
                </th>
                <th className="w-[90px] px-2.5 py-2 text-center font-semibold">
                  Setting
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    Loading vendors list...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredVendors.map((vendor, index) => {
                  const safeId = String(vendor.id || "").trim();

                  return (
                    <tr
                      key={safeId || `${vendor.mfg}-${index}`}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-2.5 py-2.5 text-slate-700">
                        <div className="truncate" title={vendor.mfg}>
                          {vendor.mfg}
                        </div>
                      </td>

                      <td className="px-2.5 py-2.5 text-slate-700">
                        <div className="truncate" title={vendor.code}>
                          {vendor.code || ""}
                        </div>
                      </td>

                      <td className="px-2.5 py-2.5 text-slate-700">
                        <div className="truncate" title={vendor.lead_time}>
                          {vendor.lead_time}
                        </div>
                      </td>

                      <td className="px-2.5 py-2.5 text-slate-700">
                        <div className="truncate" title={vendor.review_period}>
                          {vendor.review_period}
                        </div>
                      </td>

                      <td className="px-2.5 py-2.5 text-center text-slate-700">
                        <button
                          type="button"
                          onClick={() => openOrderAction(vendor)}
                          title={
                            String(vendor.order_at || "")
                              .toLowerCase()
                              .includes("website")
                              ? "Open website"
                              : "Show email order details"
                          }
                          aria-label={
                            String(vendor.order_at || "")
                              .toLowerCase()
                              .includes("website")
                              ? "Open website"
                              : "Show email order details"
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          {String(vendor.order_at || "")
                            .toLowerCase()
                            .includes("website") ? (
                            <Globe size={15} />
                          ) : (
                            <Mail size={15} />
                          )}
                        </button>
                      </td>

                      <td className="px-2.5 py-2.5 text-slate-700">
                        <div className="truncate" title={vendor.username}>
                          {vendor.username}
                        </div>
                      </td>

                      <td className="px-2.5 py-2.5 text-slate-700">
                        <div className="truncate" title={vendor.password}>
                          {showPasswords || vendor.password === "XXX"
                            ? vendor.password
                            : "••••••••"}
                        </div>
                      </td>

                      <td className="px-2.5 py-2.5 text-center text-slate-700">
                        <button
                          type="button"
                          onClick={() => openContactDetails(vendor)}
                          title="Show contact details"
                          aria-label="Show contact details"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          <Contact size={15} />
                        </button>
                      </td>

                      <td className="px-2.5 py-2.5 text-center text-slate-700">
                        {safeId ? (
                          <Link
                            href={`/masters/vendors/${safeId}/settings`}
                            title="Update vendor settings"
                            aria-label="Update vendor settings"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                          >
                            <Settings size={15} />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={openMissingIdMessage}
                            title="Missing vendor ID"
                            aria-label="Missing vendor ID"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Settings size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

              {!loading && filteredVendors.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No vendor records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Add Vendor
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              {fields.map((field) => {
                const listId = `vendor-${field.key}-options`;

                const options =
                  field.key === "lead_time"
                    ? leadTimeOptions
                    : field.key === "review_period"
                      ? reviewPeriodOptions
                      : field.key === "order_at"
                        ? orderAtOptions
                        : [];

                return (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-slate-700">
                      {field.label}
                    </label>

                    <input
                      type={field.key === "password" ? "password" : "text"}
                      list={options.length ? listId : undefined}
                      value={form[field.key]}
                      onChange={(event) =>
                        updateForm(field.key, event.target.value)
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                      required
                    />

                    {options.length > 0 && (
                      <datalist id={listId}>
                        {options.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addVendor}
                disabled={!formComplete || saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {detailModal.title}
              </h2>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {detailModal.rows.map((row) => (
                <div key={row.label}>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {row.label}
                  </p>
                  <p className="mt-1 break-words text-sm font-medium text-slate-900">
                    {row.value || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
