"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Plus, Save, Trash2 } from "lucide-react";
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
  settings?: VendorSettings | null;
};

type TableColumn = {
  header: string;
  field: string;
};

type VendorSettings = {
  emailSubject: string;
  emailBody: string;
  pdfEmailBody: string;
  tableColumns: TableColumn[];
};

const FIELD_OPTIONS = [
  "Product Title",
  "Variant",
  "SKU",
  "Qty",
  "Approved",
  "Cost",
  "Total",
  "Vendor",
  "Brand",
  "Barcode",
  "Notes",
];

const defaultColumns: TableColumn[] = [
  { header: "Item", field: "Product Title" },
  { header: "Variant", field: "Variant" },
  { header: "SKU", field: "SKU" },
  { header: "Qty", field: "Qty" },
  { header: "Approved", field: "Approved" },
];

function getTodayCodeDate() {
  return new Date()
    .toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    })
    .replace(/\//g, ".");
}

function getDefaultSettings(vendor?: VendorRow | null): VendorSettings {
  return {
    emailSubject: `${vendor?.code || "CODE"} x ${getTodayCodeDate()}`,
    emailBody: `Hi {{contact}},

Kindly see our order this week.

{{table}}

Thanks`,
    pdfEmailBody: `Hi {{contact}},

Kindly see attached for our order this week.

Thanks`,
    tableColumns: defaultColumns,
  };
}

function normalizeSettings(
  vendor: VendorRow,
  settings?: VendorSettings | null
): VendorSettings {
  const defaults = getDefaultSettings(vendor);

  return {
    emailSubject: settings?.emailSubject || defaults.emailSubject,
    emailBody: settings?.emailBody || defaults.emailBody,
    pdfEmailBody: settings?.pdfEmailBody || defaults.pdfEmailBody,
    tableColumns:
      Array.isArray(settings?.tableColumns) && settings.tableColumns.length > 0
        ? settings.tableColumns
        : defaults.tableColumns,
  };
}

export default function VendorSettingsPage() {
  const params = useParams();
  const router = useRouter();

  const vendorId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [settings, setSettings] = useState<VendorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadVendor() {
      if (!vendorId || vendorId === "undefined") {
        setMessage({
          type: "error",
          text: "The selected vendor settings page is not linked to a valid vendor record.",
        });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/vendor-list/${vendorId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load vendor settings.");
        }

        if (!data.vendor?.id) {
          throw new Error(
            "The selected vendor settings page is not linked to a valid vendor record."
          );
        }

        if (!ignore) {
          setVendor(data.vendor);
          setSettings(normalizeSettings(data.vendor, data.vendor.settings));
        }
      } catch (error) {
        if (!ignore) {
          setMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load vendor settings.",
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadVendor();

    return () => {
      ignore = true;
    };
  }, [vendorId]);

  const updateColumn = (
    index: number,
    key: keyof TableColumn,
    value: string
  ) => {
    setSettings((current) => {
      if (!current) return current;

      return {
        ...current,
        tableColumns: current.tableColumns.map((column, columnIndex) =>
          columnIndex === index ? { ...column, [key]: value } : column
        ),
      };
    });
  };

  const addColumn = () => {
    setSettings((current) => {
      if (!current) return current;

      return {
        ...current,
        tableColumns: [
          ...current.tableColumns,
          { header: "", field: FIELD_OPTIONS[0] },
        ],
      };
    });
  };

  const removeColumn = (index: number) => {
    setSettings((current) => {
      if (!current) return current;

      return {
        ...current,
        tableColumns: current.tableColumns.filter(
          (_column, columnIndex) => columnIndex !== index
        ),
      };
    });
  };

  const saveSettings = async () => {
    if (!vendor || !settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/vendor-list/${vendor.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...vendor,
          settings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save vendor settings.");
      }

      setVendor(data.vendor);
      setSettings(normalizeSettings(data.vendor, data.vendor.settings));
      setMessage({ type: "success", text: "Vendor settings saved." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save vendor settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <PageTitle
          title="Vendor Settings"
          description="Loading vendor settings..."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading...
        </div>
      </section>
    );
  }

  if (!vendor || !settings) {
    return (
      <section className="space-y-4">
        <PageTitle
          title="Vendor Settings"
          description="Unable to load this vendor."
        />

        {message && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {message.text}
          </div>
        )}

        <Link
          href="/masters/vendors"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft size={14} />
          Back to Vendors
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageTitle
          title={`${vendor.mfg} Settings`}
          description="Configure vendor email templates, table columns, and ordering details."
        />

        <div className="flex flex-wrap gap-2">
          <Link
            href="/masters/vendors"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft size={14} />
            Back
          </Link>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Vendor Details
          </h2>

          <div className="flex gap-2">
            <a
              href={`mailto:${vendor.email}`}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Mail size={14} />
              Email Order Vendor
            </a>

            {vendor.link && (
              <a
                href={
                  vendor.link.startsWith("http")
                    ? vendor.link
                    : `https://${vendor.link}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Open Website
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Detail label="MFG" value={vendor.mfg} />
          <Detail label="Code" value={vendor.code} />
          <Detail label="Lead Time" value={vendor.lead_time} />
          <Detail label="Review Period" value={vendor.review_period} />
          <Detail label="Order At" value={vendor.order_at} />
          <Detail label="Link" value={vendor.link} />
          <Detail label="Username" value={vendor.username} />
          <Detail label="Password" value={vendor.password} />
          <Detail label="Contact" value={vendor.contact} />
          <Detail label="Email" value={vendor.email} />
          <Detail label="Phone" value={vendor.phone} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Email Configuration
        </h2>

        <div className="space-y-4">
          <input
            type="text"
            value={settings.emailSubject}
            onChange={(event) =>
              setSettings((current) =>
                current
                  ? { ...current, emailSubject: event.target.value }
                  : current
              )
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
          />

          <textarea
            value={settings.emailBody}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, emailBody: event.target.value } : current
              )
            }
            rows={9}
            className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
          />

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              PDF Email Body
            </label>
            <textarea
              value={settings.pdfEmailBody}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? { ...current, pdfEmailBody: event.target.value }
                    : current
                )
              }
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Table Configuration
          </h2>

          <button
            type="button"
            onClick={addColumn}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Plus size={14} />
            Add Column
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="w-16 px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Header</th>
                <th className="px-3 py-2 text-left font-semibold">Field</th>
                <th className="w-32 px-3 py-2 text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {settings.tableColumns.map((column, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{index + 1}</td>

                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={column.header}
                      onChange={(event) =>
                        updateColumn(index, "header", event.target.value)
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <select
                      value={column.field}
                      onChange={(event) =>
                        updateColumn(index, "field", event.target.value)
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
                    >
                      {FIELD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-700">
        Available placeholders: {"{{poNumber}}"}, {"{{vendor}}"},{" "}
        {"{{customer}}"}, {"{{shipDate}}"}, {"{{total}}"}, {"{{contact}}"},{" "}
        {"{{table}}"}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </label>
      <input
        type="text"
        value={value || ""}
        readOnly
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
}