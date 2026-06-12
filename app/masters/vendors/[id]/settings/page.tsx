"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

type VendorForm = Omit<VendorRow, "id" | "settings">;

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

const detailFields: Array<{ key: keyof VendorForm; label: string }> = [
  { key: "mfg", label: "MFG" },
  { key: "code", label: "Code" },
  { key: "lead_time", label: "Lead Time" },
  { key: "review_period", label: "Review Period" },
  { key: "order_at", label: "Order At" },
  { key: "link", label: "Link" },
  { key: "username", label: "Username" },
  { key: "password", label: "Password" },
  { key: "contact", label: "Contact" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
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

function vendorToForm(vendor: VendorRow): VendorForm {
  return {
    mfg: vendor.mfg || "",
    code: vendor.code || "",
    lead_time: vendor.lead_time || "",
    review_period: vendor.review_period || "",
    order_at: vendor.order_at || "",
    link: vendor.link || "",
    username: vendor.username || "",
    password: vendor.password || "",
    contact: vendor.contact || "",
    email: vendor.email || "",
    phone: vendor.phone || "",
  };
}

function getUniqueOptions(vendors: VendorRow[], key: keyof VendorForm) {
  return Array.from(
    new Set(
      vendors
        .map((vendor) => String(vendor[key] || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export default function VendorSettingsPage() {
  const params = useParams();

  const vendorId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  const [allVendors, setAllVendors] = useState<VendorRow[]>([]);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [vendorForm, setVendorForm] = useState<VendorForm | null>(null);
  const [settings, setSettings] = useState<VendorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!vendorId || vendorId === "undefined") {
        setMessage({
          type: "error",
          text: "The selected vendor settings page is not linked to a valid vendor record.",
        });
        setLoading(false);
        return;
      }

      try {
        const [vendorResponse, vendorsResponse] = await Promise.all([
          fetch(`/api/vendor-list/${vendorId}`),
          fetch("/api/vendor-list"),
        ]);

        const vendorData = await vendorResponse.json();
        const vendorsData = await vendorsResponse.json();

        if (!vendorResponse.ok) {
          throw new Error(vendorData.error || "Unable to load vendor.");
        }

        if (!vendorData.vendor?.id) {
          throw new Error(
            "The selected vendor settings page is not linked to a valid vendor record."
          );
        }

        if (!ignore) {
          setVendor(vendorData.vendor);
          setVendorForm(vendorToForm(vendorData.vendor));
          setSettings(
            normalizeSettings(vendorData.vendor, vendorData.vendor.settings)
          );
          setAllVendors(vendorsData.vendors || []);
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
        if (!ignore) setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [vendorId]);

  const leadTimeOptions = useMemo(
    () => getUniqueOptions(allVendors, "lead_time"),
    [allVendors]
  );

  const reviewPeriodOptions = useMemo(
    () => getUniqueOptions(allVendors, "review_period"),
    [allVendors]
  );

  const orderAtOptions = useMemo(
    () => getUniqueOptions(allVendors, "order_at"),
    [allVendors]
  );

  const updateVendorForm = (key: keyof VendorForm, value: string) => {
    setVendorForm((current) =>
      current ? { ...current, [key]: value } : current
    );
  };

  const updateColumn = (
    index: number,
    key: keyof TableColumn,
    value: string
  ) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            tableColumns: current.tableColumns.map((column, columnIndex) =>
              columnIndex === index ? { ...column, [key]: value } : column
            ),
          }
        : current
    );
  };

  const addColumn = () => {
    setSettings((current) =>
      current
        ? {
            ...current,
            tableColumns: [
              ...current.tableColumns,
              { header: "", field: FIELD_OPTIONS[0] },
            ],
          }
        : current
    );
  };

  const removeColumn = (index: number) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            tableColumns: current.tableColumns.filter(
              (_column, columnIndex) => columnIndex !== index
            ),
          }
        : current
    );
  };

  const saveSettings = async () => {
    if (!vendor || !vendorForm || !settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/vendor-list/${vendor.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...vendorForm,
          settings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save vendor.");
      }

      setVendor(data.vendor);
      setVendorForm(vendorToForm(data.vendor));
      setSettings(normalizeSettings(data.vendor, data.vendor.settings));
      setMessage({ type: "success", text: "Vendor details saved." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to save vendor.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <PageTitle title="Vendor Settings" description="Loading..." />
      </section>
    );
  }

  if (!vendor || !vendorForm || !settings) {
    return (
      <section className="space-y-4">
        <PageTitle title="Vendor Settings" description="Unable to load vendor." />

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
          title={`${vendorForm.mfg || "Vendor"} Settings`}
          description="Edit vendor details, email templates, and table columns."
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
            {saving ? "Saving..." : "Save Changes"}
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
              href={`mailto:${vendorForm.email}`}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Mail size={14} />
              Email Order Vendor
            </a>

            {vendorForm.link && (
              <a
                href={
                  vendorForm.link.startsWith("http")
                    ? vendorForm.link
                    : `https://${vendorForm.link}`
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
          {detailFields.map((field) => {
            const listId = `vendor-detail-${field.key}-options`;

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
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {field.label}
                </label>

                <input
                  type="text"
                  list={options.length ? listId : undefined}
                  value={vendorForm[field.key]}
                  onChange={(event) =>
                    updateVendorForm(field.key, event.target.value)
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
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
            rows={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
          />

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
                <td className="px-3 py-2">{index + 1}</td>

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
    </section>
  );
}