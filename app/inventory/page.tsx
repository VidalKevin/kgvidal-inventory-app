"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageTitle from "@/components/PageTitle";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  Download,
  FileText,
  Globe,
  Mail,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  buildPdfOrderPreview,
  normalizeVendorPdfSettings,
  vendorUsesPdfFormat,
  type PdfFormField,
  type VendorPdfSettings,
} from "@/lib/vendorOrderPdf";

type InventoryStatus = "Healthy" | "Low Stocks" | "Critical";

type InventoryRow = {
  date: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  vendor: string;
  currentQty: number;
  onOrder: number;
  sell90Day: number;
  weeklyRate: number;
  qtyNeeded: number;
  qtyApproved: number;
  daysOfInventory: number;
  status: InventoryStatus;
  leadTime: string;
  reviewPeriod: string;
  leadTimeWeeks: number;
  reviewPeriodWeeks: number;
  uom: number;
};

type ColumnFilterKey =
  | "productTitle"
  | "variantTitle"
  | "sku"
  | "vendor"
  | "currentQty"
  | "onOrder"
  | "sell90Day"
  | "weeklyRate"
  | "qtyNeeded"
  | "qtyApproved"
  | "daysOfInventory"
  | "leadTime"
  | "reviewPeriod"
  | "status";
type SyncFrequency = "daily" | "weekly" | "custom";

const SYNC_TIME_OPTIONS = [
  { label: "12:00 AM", value: "00:00" },
  { label: "4:00 AM", value: "04:00" },
  { label: "8:00 AM", value: "08:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "8:00 PM", value: "20:00" },
];

const DEFAULT_SYNC_TIME = "08:00";

function normalizeSyncTime(value?: string) {
  return SYNC_TIME_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_SYNC_TIME;
}

type ShopifyInventoryResponse = {
  snapshotDate: string | null;
  dates?: string[];
  rows: InventoryRow[];
  error?: string;
};

type VendorRow = {
  id?: string;
  mfg: string;
  code?: string;
  order_at: string;
  link: string;
  contact: string;
  email: string;
  phone: string;
  settings?: VendorSettings | null;
};

type VendorResponse = {
  vendors: VendorRow[];
  error?: string;
};

type VendorTableColumn = {
  header: string;
  field: string;
};

type VendorSettings = VendorPdfSettings & {
  tableColumns?: VendorTableColumn[];
};

type EmailPreview = {
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  usesPdfFormat: boolean;
};

type SyncScheduleResponse = {
  schedule?: {
    time: string;
    frequency: SyncFrequency;
    days: string[];
    enabled?: boolean;
  };
  error?: string;
};

type ApprovedSaveState = "idle" | "saving" | "saved" | "error";

const DEFAULT_EMAIL_FROM = "Kevin Galang <kevin@vidalcoaching.com>";
const DEFAULT_EMAIL_COLUMNS: VendorTableColumn[] = [
  { header: "Product Title", field: "Product Title" },
  { header: "Variant", field: "Variant" },
  { header: "SKU", field: "SKU" },
  { header: "Qty", field: "Qty" },
];

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTodaySlashDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function normalizePdfFieldKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getPdfFieldValue(
  fields: PdfFormField[],
  key: string,
  fallback = ""
) {
  const normalizedKey = normalizePdfFieldKey(key);
  const field = fields.find(
    (item) =>
      normalizePdfFieldKey(item.key || "") === normalizedKey ||
      normalizePdfFieldKey(item.label) === normalizedKey
  );

  return field?.value || fallback;
}

function formatPdfCurrency(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function roundToNearestUom(value: number, uom: number) {
  const safeUom = Number.isFinite(uom) && uom > 0 ? uom : 1;
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;

  if (safeValue === 0 || safeUom <= 1) {
    return safeValue;
  }

  return Math.round(safeValue / safeUom) * safeUom;
}

function normalizeVendor(value: string) {
  return value.trim().toLowerCase();
}

function getVendorGroup(vendor: string) {
  const normalized = normalizeVendor(vendor);

  if (normalized.startsWith("vidal - ")) {
    const vidalVendor = normalized.replace("vidal - ", "").trim();
    const groupMap: Record<string, string> = {
      biotics: "biotics research",
      exemplar: "exemplar",
      nuethix: "nuethix",
      nutridyn: "nutridyn",
    };

    return groupMap[vidalVendor] ?? vidalVendor;
  }

  return normalized;
}

function isVidalVendor(vendor: string) {
  return normalizeVendor(vendor).startsWith("vidal - ");
}

function isVidalExemplarVendor(vendor: string) {
  return normalizeVendor(vendor) === "vidal - exemplar";
}

function getHighDaysThreshold(row: InventoryRow) {
  return isVidalExemplarVendor(row.vendor) ? 201 : 40;
}

function isHighDaysRow(row: InventoryRow) {
  return row.daysOfInventory >= getHighDaysThreshold(row);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseLocalDate(dateValue: string | Date | undefined) {
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return dateValue;
  }

  const value = String(dateValue || "").trim();

  if (!value) {
    return new Date();
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

function formatPoDate(dateValue: string | Date) {
  const date = parseLocalDate(dateValue);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${month}.${day}.${year}`;
}

function buildPoNumber(mfg: string, dateValue: string | Date) {
  return `${mfg} ${formatPoDate(dateValue)}`;
}

function getPurchaseOrderDate(dateValue: string | Date | undefined) {
  const date = parseLocalDate(dateValue);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeFieldName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getFirstName(value: string | undefined | null) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function isEmailAddress(value: string | undefined | null) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getVendorEmailAddress(vendor: VendorRow | null) {
  if (!vendor) return "";
  const email = String(vendor.email || "").trim();
  const link = String(vendor.link || "").trim();

  // EMAIL field is the vendor TO address; support comma-separated entries
  const emailAddresses = email
    .split(",")
    .map((s) => s.trim())
    .filter(isEmailAddress);
  if (emailAddresses.length > 0) return emailAddresses.join(", ");

  // Fall back to link field if email is empty
  const linkEmails = link
    .split(",")
    .map((s) => s.trim())
    .filter(isEmailAddress);
  if (linkEmails.length > 0) return linkEmails.join(", ");

  return "";
}

function getOrderAtLabel(orderAt: string | undefined) {
  const value = String(orderAt || "").trim();
  const normalized = value.toLowerCase();

  if (normalized.includes("website")) {
    return "Website";
  }

  if (normalized.includes("email")) {
    return "Via Email";
  }

  return value || "No details";
}

function normalizeVendorMatchKey(value: string) {
  return normalizeText(value)
    .replace(/^vidal\s*-\s*/, "")
    .replace(/[^a-z0-9]/g, "");
}

function vendorMatchesActiveName(vendor: VendorRow, activeVendorName: string) {
  const activeKey = normalizeVendorMatchKey(activeVendorName);
  const vendorKeys = [vendor.mfg, vendor.code || ""]
    .filter(Boolean)
    .map(normalizeVendorMatchKey);

  return vendorKeys.some(
    (key) => key === activeKey || key.includes(activeKey) || activeKey.includes(key)
  );
}

function getSavedSyncSchedule() {
  const defaultSchedule = {
    time: DEFAULT_SYNC_TIME,
    frequency: "weekly" as SyncFrequency,
    days: ["M"],
  };

  if (typeof window === "undefined") {
    return defaultSchedule;
  }

  const savedSchedule = window.localStorage.getItem("shopify-sync-schedule");

  if (!savedSchedule) {
    return defaultSchedule;
  }

  try {
    const parsed = JSON.parse(savedSchedule) as {
      time?: string;
      frequency?: SyncFrequency;
      days?: string[];
    };

    return {
      time: normalizeSyncTime(parsed.time),
      frequency: parsed.frequency || defaultSchedule.frequency,
      days: parsed.days?.length ? parsed.days : defaultSchedule.days,
    };
  } catch {
    window.localStorage.removeItem("shopify-sync-schedule");
    return defaultSchedule;
  }
}

export default function InventoryPage() {
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [syncingShopify, setSyncingShopify] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [showScheduleFields, setShowScheduleFields] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(() => getSavedSyncSchedule().time);
  const [scheduleFrequency, setScheduleFrequency] = useState<SyncFrequency>(() => getSavedSyncSchedule().frequency);
  const [scheduleDays, setScheduleDays] = useState<string[]>(() => getSavedSyncSchedule().days);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [inventoryMessage, setInventoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uomNoticeSku, setUomNoticeSku] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [approvedQtyBySku, setApprovedQtyBySku] = useState<Record<string, number>>({});
  const [approvedQtyDraftBySku, setApprovedQtyDraftBySku] = useState<Record<string, string>>({});
  const [, setApprovedSaveBySku] = useState<Record<string, ApprovedSaveState>>({});
  const [activeApprovedSku, setActiveApprovedSku] = useState<string | null>(null);
  const [hoveredApprovedSku, setHoveredApprovedSku] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showLeadColumns, setShowLeadColumns] = useState(false);
  const [showHighDaysOnly, setShowHighDaysOnly] = useState(false);
  const [activePoVendor, setActivePoVendor] = useState<string | null>(null);
  const [savedPoNumber, setSavedPoNumber] = useState("");
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [editedEmailTo, setEditedEmailTo] = useState("");
  const [editedEmailSubject, setEditedEmailSubject] = useState("");
  const [editedEmailBody, setEditedEmailBody] = useState("");
  const [pdfFileByPoNumber, setPdfFileByPoNumber] = useState<Record<string, string>>({});
  const [columnFilters, setColumnFilters] = useState<Record<ColumnFilterKey, string>>({
    productTitle: "All",
    variantTitle: "All",
    sku: "All",
    vendor: "All",
    currentQty: "All",
    onOrder: "All",
    sell90Day: "All",
    weeklyRate: "All",
    qtyNeeded: "All",
    qtyApproved: "All",
    daysOfInventory: "All",
    leadTime: "All",
    reviewPeriod: "All",
    status: "All",
  });
  const [openDropdown, setOpenDropdown] = useState<ColumnFilterKey | null>(null);

  useEffect(() => {
    if (!uomNoticeSku) {
      return;
    }

    const timer = window.setTimeout(() => {
      setUomNoticeSku(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [uomNoticeSku]);

  const showUomNotice = (sku: string, uom: number) => {
    if (Number.isFinite(uom) && uom > 1) {
      setUomNoticeSku(sku);
    }
  };

  const loadShopifyInventory = async (refresh = false, date = selectedDate) => {
    setLoadingInventory(true);

    try {
      const params = new URLSearchParams();

      if (refresh) {
        params.set("refresh", "1");
      }

      if (date) {
        params.set("date", date);
      }

      const response = await fetch(
        `/api/inventory/shopify-snapshot${params.toString() ? `?${params}` : ""}`
      );
      const data = (await response.json()) as ShopifyInventoryResponse;

      if (!response.ok) {
        throw new Error(data.error || "Unable to load Shopify inventory.");
      }

      setInventoryRows(data.rows);
      setAvailableDates(data.dates ?? []);
      if (!date && data.snapshotDate) {
        setSelectedDate(data.snapshotDate);
      }
      setInventoryMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load Shopify inventory.";
      setInventoryMessage({ type: "error", text: message });
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    fetch("/api/inventory/shopify-snapshot")
      .then(async (response) => {
        const data = (await response.json()) as ShopifyInventoryResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load Shopify inventory.");
        }

        return data;
      })
      .then((data) => {
        if (ignore) {
          return;
        }

        setInventoryRows(data.rows);
        setAvailableDates(data.dates ?? []);
        setSelectedDate(data.snapshotDate ?? "");
        setInventoryMessage(null);
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unable to load Shopify inventory.";
        setInventoryMessage({ type: "error", text: message });
      })
      .finally(() => {
        if (!ignore) {
          setLoadingInventory(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetch("/api/vendor-list")
      .then(async (response) => {
        const data = (await response.json()) as VendorResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load vendor list.");
        }

        return data.vendors;
      })
      .then((loadedVendors) => {
        if (!ignore) {
          setVendors(loadedVendors);
        }
      })
      .catch(() => {
        if (!ignore) {
          setVendors([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetch("/api/sync/shopify-schedule")
      .then(async (response) => {
        const data = (await response.json()) as SyncScheduleResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load Shopify sync schedule.");
        }

        return data.schedule;
      })
      .then((schedule) => {
        if (!ignore && schedule) {
          const normalizedTime = normalizeSyncTime(schedule.time);

          setScheduleTime(normalizedTime);
          setScheduleFrequency(schedule.frequency);
          setScheduleDays(schedule.days);
          window.localStorage.setItem(
            "shopify-sync-schedule",
            JSON.stringify({
              time: normalizedTime,
              frequency: schedule.frequency,
              days: schedule.days,
            })
          );
        }
      })
      .catch(() => {
        // Keep the local saved schedule as a fallback until Supabase setup is complete.
      });

    return () => {
      ignore = true;
    };
  }, []);

  const dates = useMemo(() => {
    return availableDates.length
      ? availableDates
      : Array.from(new Set(inventoryRows.map((r) => r.date))).sort((a, b) =>
          b.localeCompare(a)
        );
  }, [availableDates, inventoryRows]);

  const latestDate = dates[0] ?? "";
  const effectiveDate = selectedDate || latestDate;

  const getFilterValue = useCallback((row: InventoryRow, key: ColumnFilterKey) => {
    if (key === "qtyApproved") {
      return String(approvedQtyBySku[row.sku] ?? row.qtyApproved);
    }

    return String(row[key]);
  }, [approvedQtyBySku]);

  const uniqueValues = (key: ColumnFilterKey) =>
    Array.from(
      new Set(
        inventoryRows
          .filter((row) => !effectiveDate || row.date === effectiveDate)
          .map((row) => getFilterValue(row, key))
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filteredRows = useMemo(() => {
    return inventoryRows.filter((row) => {
      const matchesDate = row.date === effectiveDate;
      const query = search.toLowerCase();
      const matchesSearch = !query ||
        row.sku.toLowerCase().includes(query) ||
        row.productTitle.toLowerCase().includes(query) ||
        row.variantTitle.toLowerCase().includes(query) ||
        row.vendor.toLowerCase().includes(query);
      const matchesColumns = (Object.keys(columnFilters) as ColumnFilterKey[]).every(
        (key) => columnFilters[key] === "All" || getFilterValue(row, key) === columnFilters[key]
      );
      const matchesDaysMode = showHighDaysOnly ? isHighDaysRow(row) : !isHighDaysRow(row);
      return matchesDate && matchesSearch && matchesColumns && matchesDaysMode;
    });
  }, [inventoryRows, search, effectiveDate, columnFilters, getFilterValue, showHighDaysOnly]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const exemplarCompare =
        Number(isVidalExemplarVendor(a.vendor)) -
        Number(isVidalExemplarVendor(b.vendor));

      if (exemplarCompare !== 0) {
        return exemplarCompare;
      }

      const groupCompare = getVendorGroup(a.vendor).localeCompare(
        getVendorGroup(b.vendor),
        undefined,
        { sensitivity: "base" }
      );

      if (groupCompare !== 0) {
        return groupCompare;
      }

      const vidalCompare = Number(isVidalVendor(a.vendor)) - Number(isVidalVendor(b.vendor));

      if (vidalCompare !== 0) {
        return vidalCompare;
      }

      const vendorCompare = a.vendor.localeCompare(b.vendor, undefined, {
        sensitivity: "base",
      });

      if (vendorCompare !== 0) {
        return vendorCompare;
      }

      return a.productTitle.localeCompare(b.productTitle, undefined, {
        sensitivity: "base",
      });
    });
  }, [filteredRows]);

  const dateRows = useMemo(() => {
    return inventoryRows.filter((row) => row.date === effectiveDate);
  }, [inventoryRows, effectiveDate]);

  const getApprovedQtyNumber = useCallback(
    (row: InventoryRow) => {
      if (approvedQtyDraftBySku[row.sku] !== undefined) {
        const draft = approvedQtyDraftBySku[row.sku].trim();

        if (!draft) {
          return 0;
        }

        const parsed = Number(draft);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      }

      return Number(approvedQtyBySku[row.sku] ?? row.qtyApproved ?? 0);
    },
    [approvedQtyBySku, approvedQtyDraftBySku]
  );

  const getApprovedDisplayValue = useCallback(
    (row: InventoryRow) => {
      if (approvedQtyDraftBySku[row.sku] !== undefined) {
        return approvedQtyDraftBySku[row.sku];
      }

      const qty = Number(approvedQtyBySku[row.sku] ?? row.qtyApproved ?? 0);
      return qty > 0 ? String(qty) : "";
    },
    [approvedQtyBySku, approvedQtyDraftBySku]
  );

  const getApprovedQty = useCallback(
    (row: InventoryRow) => getApprovedQtyNumber(row),
    [getApprovedQtyNumber]
  );

  const poRows = useMemo(() => {
    if (!activePoVendor) {
      return [] as InventoryRow[];
    }

    return dateRows
      .filter((row) => row.vendor === activePoVendor && getApprovedQty(row) > 0)
      .sort((a, b) =>
        a.productTitle.localeCompare(b.productTitle, undefined, {
          sensitivity: "base",
        })
      );
  }, [activePoVendor, dateRows, getApprovedQty]);

  const poApprovedTotal = poRows.reduce(
    (total, row) => total + getApprovedQty(row),
    0
  );

  const activeVendorDetails = useMemo(() => {
    if (!activePoVendor) {
      return null;
    }

    const vendor =
      vendors.find((entry) => vendorMatchesActiveName(entry, activePoVendor)) ??
      null;

    if (!vendor) {
      return null;
    }

    return {
      ...vendor,
      settings: normalizeVendorPdfSettings(
        vendor.settings,
        vendor.mfg,
        vendor.code
      ),
    };
  }, [activePoVendor, vendors]);

  useEffect(() => {
    let ignore = false;

    if (!activePoVendor) {
      return () => {
        ignore = true;
      };
    }

    const poSnapshotDate = getPurchaseOrderDate(effectiveDate || getTodayDate());
    const expectedPoNumber = buildPoNumber(activeVendorDetails?.code || activePoVendor, poSnapshotDate);

    fetch("/api/purchase-orders")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to check purchase orders.");
        return data.purchaseOrders || [];
      })
      .then((purchaseOrders) => {
        if (ignore) return;
        const exists = purchaseOrders.some(
          (order: { po_number?: string }) => order.po_number === expectedPoNumber
        );
        setSavedPoNumber(exists ? expectedPoNumber : "");
      })
      .catch(() => {
        if (!ignore) setSavedPoNumber("");
      });

    return () => {
      ignore = true;
    };
  }, [activePoVendor, activeVendorDetails?.code, effectiveDate]);

  const activeVendorUsesPdf = vendorUsesPdfFormat(activeVendorDetails?.settings);

  const openOrderDestination = () => {
    if (!activeVendorDetails) {
      setInventoryMessage({
        type: "error",
        text: "No vendor order details found for this vendor.",
      });
      return;
    }

    if (activeVendorDetails.order_at.toLowerCase().includes("website")) {
      const href = activeVendorDetails.link.startsWith("http")
        ? activeVendorDetails.link
        : `https://${activeVendorDetails.link}`;
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    setInventoryMessage({
      type: "success",
      text: `Order by email: ${activeVendorDetails.email || activeVendorDetails.link}`,
    });
  };

  const ensurePoNumber = () => {
    const poSnapshotDate = getPurchaseOrderDate(effectiveDate || poRows[0]?.date || getTodayDate());
    return buildPoNumber(activeVendorDetails?.code || (activePoVendor ?? poRows[0]?.vendor ?? "PO"), poSnapshotDate);
  };

  const buildPurchaseOrderPayloadRows = (poNumber: string) => {
    const poCreatedDate = getPurchaseOrderDate(effectiveDate || poRows[0]?.date || getTodayDate());

    return poRows
      .filter((row) => getApprovedQty(row) > 0)
      .map((row) => ({
        date: poCreatedDate,
        mfg: row.vendor,
        product_title: row.productTitle,
        variant_title: row.variantTitle,
        sku: row.sku,
        qty: getApprovedQty(row),
        qty_received: 0,
        diff: 0,
        po_number: poNumber,
        status: "Pending",
      }));
  };

  const savePurchaseOrder = async () => {
    if (!activePoVendor || poRows.length === 0) {
      setInventoryMessage({
        type: "error",
        text: "Add approved quantities for this vendor before creating a purchase order.",
      });
      return "";
    }

    const poNumber = ensurePoNumber();
    const payloadRows = buildPurchaseOrderPayloadRows(poNumber);

    if (payloadRows.length === 0) {
      setInventoryMessage({
        type: "error",
        text: "Only rows with Amount Approved greater than 0 can be saved to Purchase Orders.",
      });
      return "";
    }

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: payloadRows }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create purchase order.");
      }

      setSavedPoNumber(poNumber);
      setInventoryMessage({
        type: "success",
        text: data.updatedExisting
          ? `Updated existing ${poNumber} in Purchase Orders.`
          : `Saved ${poNumber} to Purchase Orders as Pending.`,
      });

      return poNumber;
    } catch (error) {
      setInventoryMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to create purchase order.",
      });
      return "";
    }
  };

  const pdfOrderPreview = useMemo(() => {
    if (!activePoVendor || poRows.length === 0) {
      return null;
    }

    const poDate = getPurchaseOrderDate(effectiveDate || poRows[0]?.date);
    const poNumber = savedPoNumber || buildPoNumber(activeVendorDetails?.code || activePoVendor, poDate);

    return buildPdfOrderPreview({
      poNumber,
      vendorName: activePoVendor,
      vendorCode: activeVendorDetails?.code,
      settings: activeVendorDetails?.settings,
      rows: poRows.map((row) => ({
        sku: row.sku,
        productTitle: row.productTitle,
        variantTitle: row.variantTitle,
        qty: getApprovedQty(row),
      })),
    });
  }, [
    activePoVendor,
    activeVendorDetails,
    effectiveDate,
    getApprovedQty,
    poRows,
    savedPoNumber,
  ]);

  const buildPurchaseOrderPdfDoc = () => {
    if (!pdfOrderPreview) return null;

    const doc = new jsPDF();
    let y = 18;

    if (pdfOrderPreview.template === "bondi-pure") {
      const fieldValue = (key: string, fallback = "") =>
        getPdfFieldValue(pdfOrderPreview.formFields, key, fallback);
      const purchaseOrderDate = fieldValue(
        "purchaseOrderDate",
        getTodaySlashDate()
      );
      const purchaseOrderNumber = fieldValue(
        "purchaseOrderNumber",
        pdfOrderPreview.poNumber
      );
      const deliveryDate = fieldValue("deliveryDate");
      const deliveryAddress = fieldValue("deliveryAddress");
      const deliveryInstructions = fieldValue("deliveryInstructions");
      const attention = fieldValue("attention");
      const telephone = fieldValue("telephone");
      const totalAmount =
        pdfOrderPreview.totalAmount ??
        pdfOrderPreview.rows.reduce(
          (total, row) => total + Number(row.total || 0),
          0
        );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("PURCHASE ORDER", 14, y);
      y += 8;
      doc.text(pdfOrderPreview.vendorName, 14, y);

      doc.setFontSize(8);
      doc.text("Purchase Order Date:", 118, 18);
      doc.setFontSize(11);
      doc.text(purchaseOrderDate || "-", 118, 25);
      doc.setFontSize(8);
      doc.text("Delivery Date:", 118, 35);
      doc.text("Purchase Order Number:", 118, 42);
      doc.setFont("helvetica", "normal");
      doc.text(deliveryDate || "-", 158, 35);
      doc.text(purchaseOrderNumber || "-", 158, 42);

      y = 72;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Description", 14, y);
      doc.text("Quantity", 112, y, { align: "right" });
      doc.text("Unit Price", 160, y, { align: "right" });
      doc.text("Amount USD", 196, y, { align: "right" });
      y += 3;
      doc.line(14, y, 196, y);
      y += 7;

      pdfOrderPreview.rows.forEach((row) => {
        if (y > 245) {
          doc.addPage();
          y = 18;
        }
        const descriptionLines = doc.splitTextToSize(row.itemName, 92);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(descriptionLines, 14, y);
        doc.text(String(row.qty), 112, y, { align: "right" });
        doc.text(formatPdfCurrency(row.unitPrice || 0), 160, y, {
          align: "right",
        });
        doc.text(formatPdfCurrency(row.total || 0), 196, y, {
          align: "right",
        });
        y += Math.max(7, descriptionLines.length * 5 + 2);
      });

      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total: ${formatPdfCurrency(totalAmount)} USD`, 14, y);

      y += 54;
      if (y > 240) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(13);
      doc.text("DELIVERY DETAILS", 14, y);
      y += 13;
      doc.setFontSize(8);
      doc.text("Delivery Address", 14, y);
      doc.text("Attention", 82, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(deliveryAddress || "-", 54), 14, y);
      doc.text(doc.splitTextToSize(attention || "-", 54), 82, y);

      if (deliveryInstructions) {
        y += 18;
        doc.setFont("helvetica", "bold");
        doc.text("Delivery Instructions:", 14, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.text(doc.splitTextToSize(deliveryInstructions, 54), 14, y);
      }

      doc.setFont("helvetica", "bold");
      doc.text("Telephone", 82, y + 18);
      doc.setFont("helvetica", "normal");
      doc.text(telephone || "-", 82, y + 23);

      return doc;
    }

    doc.setFontSize(16);
    doc.text("Purchase Order", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`PO Number: ${pdfOrderPreview.poNumber}`, 14, y);
    y += 6;
    doc.text(`Vendor: ${pdfOrderPreview.vendorName}`, 14, y);
    y += 10;

    pdfOrderPreview.formFields.forEach((field) => {
      if (y > 265) { doc.addPage(); y = 18; }
      doc.setFont("helvetica", "bold");
      doc.text(`${field.label}:`, 14, y);
      doc.setFont("helvetica", "normal");
      const valueLines = doc.splitTextToSize(field.value || "-", 118);
      doc.text(valueLines, 62, y);
      y += Math.max(6, valueLines.length * 5) + 3;
    });

    y += 4;
    if (y > 250) { doc.addPage(); y = 18; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Item SKU # / Private label SKU #", 14, y);
    doc.text("Item Name (Flavor):", 62, y);
    doc.text("Item Quantity:", 178, y, { align: "right" });
    y += 4;
    doc.line(14, y, 195, y);
    y += 6;
    doc.setFont("helvetica", "normal");

    pdfOrderPreview.rows.forEach((row) => {
      const itemLines = doc.splitTextToSize(row.itemName, 88);
      if (y > 270) { doc.addPage(); y = 18; }
      doc.text(row.itemSku || "-", 14, y);
      doc.text(itemLines, 62, y);
      doc.text(String(row.qty), 178, y, { align: "right" });
      y += Math.max(6, itemLines.length * 5);
    });

    y += 4;
    doc.line(14, y, 195, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(`Total approved qty: ${poApprovedTotal}`, 14, y);

    return doc;
  };

  const uploadPdfToSupabase = async (poNumber: string, pdfBase64: string) => {
    const response = await fetch("/api/upload-po-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poNumber, pdfBase64 }),
    });
    const data = await response.json() as { success?: boolean; filename?: string; error?: string };
    if (!response.ok || !data.success) throw new Error(data.error || "Upload failed.");
    return data.filename as string;
  };

  const generatePurchaseOrderPdf = async (mode: "preview" | "download") => {
    const doc = buildPurchaseOrderPdfDoc();

    if (!doc || !pdfOrderPreview) {
      setInventoryMessage({
        type: "error",
        text: "No PDF order data is available for this vendor.",
      });
      return;
    }

    if (mode === "preview") {
      window.open(doc.output("bloburl"), "_blank");
      return;
    }

    // Get base64 and upload to Supabase for versioning
    const arrayBuffer = doc.output("arraybuffer");
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdfBase64 = btoa(uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), ""));

    try {
      const filename = await uploadPdfToSupabase(pdfOrderPreview.poNumber, pdfBase64);
      setPdfFileByPoNumber((current) => ({
        ...current,
        [pdfOrderPreview.poNumber]: filename,
      }));
      setInventoryMessage({
        type: "success",
        text: `PDF saved to Supabase storage as ${filename}. It will be attached when you send the PO email.`,
      });
    } catch (error) {
      setInventoryMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save PDF to Supabase storage.",
      });
    }
  };

  const getEmailFieldValue = useCallback((row: InventoryRow, field: string) => {
    const approved = getApprovedQty(row);

    switch (normalizeFieldName(field)) {
      case "producttitle":
      case "item":
        return row.productTitle;
      case "variant":
      case "varianttitle":
        return row.variantTitle;
      case "sku":
        return row.sku;
      case "qty":
      case "quantity":
      case "approved":
        return approved;
      case "vendor":
      case "brand":
        return row.vendor;
      case "onorder":
        return row.onOrder;
      case "sales90d":
      case "90dsales":
      case "90daysales":
        return row.sell90Day;
      case "weekly":
      case "weeklysellrate":
        return row.weeklyRate;
      case "needed":
        return row.qtyNeeded;
      default:
        return row.productTitle;
    }
  }, [getApprovedQty]);

  const emailPreview = useMemo<EmailPreview>(() => {
    const poDate = getPurchaseOrderDate(effectiveDate || poRows[0]?.date);
    const dateCode = formatPoDate(poDate);
    const vendorName = activePoVendor ?? poRows[0]?.vendor ?? "Vendor";
    const vendorCode = activeVendorDetails?.code || vendorName;
    const poNumber = savedPoNumber || buildPoNumber(vendorCode, poDate);
    const settings = activeVendorDetails?.settings ?? null;
    const usesPdfFormat = vendorUsesPdfFormat(settings);
    const tableColumns =
      settings?.tableColumns && settings.tableColumns.length > 0
        ? settings.tableColumns
        : DEFAULT_EMAIL_COLUMNS;
    const subjectTemplate =
      settings?.emailSubject?.trim() || `${vendorCode} x ${dateCode}`;
    const bodyTemplate =
      usesPdfFormat
        ? settings?.pdfEmailBody?.trim() ||
          `Hi {{contact}},\n\nKindly see attached for our order this week.\n\n{{table}}\n\nThanks`
        : settings?.emailBody?.trim() ||
          `Hi {{contact}},\n\nKindly see our order this week.\n\n{{table}}\n\nThanks`;
    const tableRows = poRows.map((row) =>
      tableColumns.map((column) => String(getEmailFieldValue(row, column.field)))
    );
    const tableText = [
      tableColumns.map((column) => column.header).join("\t"),
      ...tableRows.map((values) => values.join("\t")),
    ].join("\n");
    const tableHtml = `
      <table style="border-collapse:collapse;">
        <thead>
          <tr>
            ${tableColumns
              .map(
                (column) =>
                  `<th style="border:1px solid #1f2937;background:#1f5f8b;color:#ffffff;padding:3px 6px;text-align:left;">${escapeHtml(column.header)}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${tableRows
            .map(
              (values) =>
                `<tr>${values
                  .map(
                    (value, index) =>
                      `<td style="border:1px solid #1f2937;padding:3px 6px;${
                        normalizeFieldName(tableColumns[index]?.field || "") === "qty" ||
                        normalizeFieldName(tableColumns[index]?.field || "") === "approved"
                          ? "text-align:right;"
                          : ""
                      }">${escapeHtml(value)}</td>`
                  )
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    const pdfMappings =
      usesPdfFormat && Array.isArray(settings?.pdfSkuMappings)
        ? settings.pdfSkuMappings
        : [];
    const mappingBySku = new Map(
      pdfMappings
        .filter((mapping) => mapping.sku)
        .map((mapping) => [normalizeVendorMatchKey(mapping.sku), mapping])
    );
    const pdfFormFields =
      usesPdfFormat && Array.isArray(settings?.pdfFormFields)
        ? settings.pdfFormFields.filter((field) => field.label.trim())
        : [];
    const pdfRows =
      pdfOrderPreview?.rows ??
      poRows.map((row) => {
        const mappedItem = mappingBySku.get(normalizeVendorMatchKey(row.sku));
        const itemName =
          mappedItem?.itemName ||
          (row.variantTitle && row.variantTitle !== "Default Title"
            ? `${row.productTitle} - ${row.variantTitle}`
            : row.productTitle);

        return {
          itemSku: mappedItem?.itemSku || row.sku || "-",
          itemName,
          qty: getApprovedQty(row),
        };
      });
    const resolvedPdfFormFields = pdfOrderPreview?.formFields ?? pdfFormFields;
    const pdfFieldsText = resolvedPdfFormFields
      .map((field) => `${field.label}: ${field.value || "-"}`)
      .join("\n");
    const pdfRowsText = [
      "Item SKU # / Private label SKU #\tItem Name (Flavor):\tItem Quantity:",
      ...pdfRows.map((row) => `${row.itemSku}\t${row.itemName}\t${row.qty}`),
    ].join("\n");
    const pdfTableText = [pdfFieldsText, pdfRowsText].filter(Boolean).join("\n\n");
    const pdfFieldsHtml = pdfOrderPreview?.fieldsHtml ||
      (resolvedPdfFormFields.length
        ? `<table style="border-collapse:collapse;margin-bottom:12px;width:100%;max-width:680px;"><tbody>${resolvedPdfFormFields
            .map(
              (field) =>
                `<tr><td style="border:1px solid #1f2937;padding:5px 7px;font-weight:700;width:32%;">${escapeHtml(field.label)}</td><td style="border:1px solid #1f2937;padding:5px 7px;white-space:pre-line;">${escapeHtml(field.value || "-")}</td></tr>`
            )
            .join("")}</tbody></table>`
        : "");
    const pdfRowsHtml = pdfOrderPreview?.rowsHtml || `
      <table style="border-collapse:collapse;width:100%;max-width:680px;">
        <thead>
          <tr>
            <th style="border:1px solid #1f2937;background:#1f5f8b;color:#ffffff;padding:4px 7px;text-align:left;">Item SKU # / Private label SKU #</th>
            <th style="border:1px solid #1f2937;background:#1f5f8b;color:#ffffff;padding:4px 7px;text-align:left;">Item Name (Flavor):</th>
            <th style="border:1px solid #1f2937;background:#1f5f8b;color:#ffffff;padding:4px 7px;text-align:right;">Item Quantity:</th>
          </tr>
        </thead>
        <tbody>
          ${pdfRows
            .map(
              (row) =>
                `<tr><td style="border:1px solid #1f2937;padding:4px 7px;">${escapeHtml(row.itemSku)}</td><td style="border:1px solid #1f2937;padding:4px 7px;">${escapeHtml(row.itemName)}</td><td style="border:1px solid #1f2937;padding:4px 7px;text-align:right;">${escapeHtml(row.qty)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    const pdfTableHtml = `${pdfFieldsHtml}${pdfRowsHtml}`;
    const replacements: Record<string, string> = {
      contact: (() => {
        const raw = String(activeVendorDetails?.contact || "").trim();
        if (raw.includes("|")) return "all";
        return getFirstName(raw || activeVendorDetails?.mfg || vendorName) || vendorName;
      })(),
      table: usesPdfFormat ? pdfTableText : tableText,
      poNumber,
      vendor: vendorName,
      code: vendorCode,
      date: dateCode,
      orderDate: dateCode,
    };
    const htmlReplacements = Object.fromEntries(
      Object.entries(replacements).map(([key, value]) => [key, escapeHtml(value)])
    ) as Record<string, string>;
    htmlReplacements.table = usesPdfFormat ? pdfTableHtml : tableHtml;
    const rawHtmlTemplate = bodyTemplate
      .split("\n\n")
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
      .join("");
    const replacePlaceholders = (template: string, values: Record<string, string>) =>
      template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
        return values[key] ?? values[key.charAt(0).toLowerCase() + key.slice(1)] ?? "";
      });
    const hasTablePlaceholder = /\{\{\s*table\s*\}\}/i.test(bodyTemplate);
    const htmlTemplate = hasTablePlaceholder
      ? rawHtmlTemplate.replace(`<p>${escapeHtml("{{table}}")}</p>`, htmlReplacements.table)
      : `${rawHtmlTemplate}${usesPdfFormat ? "" : tableHtml}`;
    const bodyTextBase = replacePlaceholders(bodyTemplate, replacements);
    const bodyHtml = replacePlaceholders(htmlTemplate, htmlReplacements);
    const bodyText = bodyTextBase;

    return {
      from: DEFAULT_EMAIL_FROM,
      to: getVendorEmailAddress(activeVendorDetails),
      subject: replacePlaceholders(subjectTemplate, replacements),
      bodyText,
      bodyHtml,
      usesPdfFormat,
    };
  }, [
    activePoVendor,
    activeVendorDetails,
    effectiveDate,
    getApprovedQty,
    getEmailFieldValue,
    pdfOrderPreview,
    poRows,
    savedPoNumber,
  ]);

  const sendPurchaseOrderEmail = async () => {
    const toAddress = editedEmailTo || emailPreview.to;

    if (!toAddress) {
      setInventoryMessage({
        type: "error",
        text: "Vendor email is missing. Add a recipient address first.",
      });
      return;
    }

    setSendingEmail(true);

    try {
      const poNumber = await savePurchaseOrder();

      if (!poNumber) {
        return;
      }

      // For PDF vendors, generate PDF, upload to Supabase, and attach
      let attachments: Array<{ filename: string; contentType: string; contentBase64: string }> = [];

      if (emailPreview.usesPdfFormat) {
        const doc = buildPurchaseOrderPdfDoc();

        if (doc) {
          const arrayBuffer = doc.output("arraybuffer");
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdfBase64 = btoa(uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), ""));

          let filename = `${poNumber}.pdf`;
          try {
            const uploaded = await uploadPdfToSupabase(poNumber, pdfBase64);
            filename = uploaded;
            setPdfFileByPoNumber((current) => ({
              ...current,
              [poNumber]: uploaded,
            }));
          } catch {
            // proceed with default filename if upload fails
          }

          attachments = [{ filename, contentType: "application/pdf", contentBase64: pdfBase64 }];
        }
      }

      const bodyText = editedEmailBody || emailPreview.bodyText;
      const bodyHtml = editedEmailBody
        ? editedEmailBody.split("\n\n").map((b) => `<p>${b.replace(/\n/g, "<br/>")}</p>`).join("")
        : emailPreview.bodyHtml;
      const subject = editedEmailSubject || emailPreview.subject;

      const response = await fetch("/api/send-po-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: emailPreview.from,
          to: toAddress,
          subject,
          html: bodyHtml,
          text: bodyText,
          poNumber,
          vendor: activePoVendor,
          attachments,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to send email.");
      }

      setInventoryMessage({
        type: "success",
        text: `Sent ${subject} to ${toAddress}.`,
      });
      setEmailPreviewOpen(false);
    } catch (error) {
      setInventoryMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to send email.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const syncShopifyInventory = async () => {
    setSyncingShopify(true);
    setInventoryMessage(null);
    setSyncModalOpen(false);

    try {
      const response = await fetch("/api/sync/shopify-inventory");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Shopify sync failed.");
      }

      setInventoryMessage({
        type: "success",
        text: `Synced ${data.inserted ?? 0} Shopify rows and saved ${data.forecastSaved ?? 0} forecast rows for ${data.snapshotDate}.`,
      });
      await loadShopifyInventory(true, selectedDate);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Shopify sync failed.";
      setInventoryMessage({ type: "error", text: message });
    } finally {
      setSyncingShopify(false);
    }
  };

  const toggleScheduleDay = (day: string) => {
    setScheduleDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }

      return [...current, day];
    });
  };

  const saveSyncSchedule = async () => {
    const days = scheduleFrequency === "daily" ? ["S", "M", "T", "W", "T2", "F", "S2"] : scheduleDays;

    const normalizedTime = normalizeSyncTime(scheduleTime);

    window.localStorage.setItem(
      "shopify-sync-schedule",
      JSON.stringify({
        time: normalizedTime,
        frequency: scheduleFrequency,
        days,
      })
    );

    setSavingSchedule(true);
    setInventoryMessage(null);

    try {
      const response = await fetch("/api/sync/shopify-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time: normalizedTime,
          frequency: scheduleFrequency,
          days,
          enabled: true,
        }),
      });
      const data = (await response.json()) as SyncScheduleResponse;

      if (!response.ok) {
        throw new Error(data.error || "Unable to save Shopify sync schedule.");
      }

      setSyncModalOpen(false);
      setInventoryMessage({
        type: "success",
        text: "Shopify sync schedule saved to Supabase. The automated caller will run it when the deployed scheduler is configured.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save Shopify sync schedule.";
      setInventoryMessage({ type: "error", text: message });
    } finally {
      setSavingSchedule(false);
    }
  };

  const downloadExcel = () => {
    const rowsToExport = sortedRows.length ? sortedRows : dateRows;

    if (rowsToExport.length === 0) {
      setInventoryMessage({
        type: "error",
        text: "No inventory rows are available to download for this date.",
      });
      return;
    }

    const exportRows = rowsToExport.map((row) => ({
      "Product Title": row.productTitle,
      "Variant Title": row.variantTitle,
      SKU: row.sku,
      Vendor: row.vendor,
      "Current Qty": row.currentQty,
      "On Order": row.onOrder,
      "90 Day Sell Rate": row.sell90Day,
      "Weekly Sell Rate": row.weeklyRate,
      "Amount Needed": row.qtyNeeded,
      "Qty Approved": approvedQtyBySku[row.sku] ?? row.qtyApproved,
      "Days of Inventory": row.daysOfInventory,
      "Lead Time": row.leadTime,
      "Review Period": row.reviewPeriod,
      UOM: row.uom,
      Status: row.status,
    }));

    const exportHeaders = Object.keys(exportRows[0] ?? {
      "Product Title": "",
      "Variant Title": "",
      SKU: "",
      Vendor: "",
      "Current Qty": "",
      "On Order": "",
      "90 Day Sell Rate": "",
      "Weekly Sell Rate": "",
      "Amount Needed": "",
      "Qty Approved": "",
      "Days of Inventory": "",
      "Lead Time": "",
      "Review Period": "",
      UOM: "",
      Status: "",
    });

    const tableRows = exportRows
      .map((row) => {
        return `<tr>${exportHeaders
          .map((header) => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`)
          .join("")}</tr>`;
      })
      .join("");

    const worksheet = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table>
            <thead>
              <tr>${exportHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([worksheet], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${effectiveDate || "latest"}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const saveApprovedQty = async (row: InventoryRow, value: number) => {
    setApprovedSaveBySku((prev) => ({ ...prev, [row.sku]: "saving" }));

    try {
      const response = await fetch("/api/inventory/shopify-snapshot", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snapshotDate: row.date,
          sku: row.sku,
          qtyApproved: value,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save approved quantity.");
      }

      setInventoryRows((current) =>
        current.map((item) =>
          item.date === row.date && item.sku === row.sku
            ? { ...item, qtyApproved: value }
            : item
        )
      );
      setApprovedSaveBySku((prev) => ({ ...prev, [row.sku]: "saved" }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save approved quantity.";
      setInventoryMessage({ type: "error", text: message });
      setApprovedSaveBySku((prev) => ({ ...prev, [row.sku]: "error" }));
    }
  };

  const setApprovedQty = (sku: string, rawValue: string) => {
    setActiveApprovedSku(sku);
    setApprovedQtyDraftBySku((prev) => ({ ...prev, [sku]: rawValue }));
  };

  const beginApprovedQtyEdit = (row: InventoryRow) => {
    setActiveApprovedSku(row.sku);
    setApprovedQtyDraftBySku((prev) => {
      if (prev[row.sku] !== undefined) {
        return prev;
      }

      const qty = Number(approvedQtyBySku[row.sku] ?? row.qtyApproved ?? 0);
      return { ...prev, [row.sku]: qty > 0 ? String(qty) : "" };
    });
  };

  const commitApprovedQty = (row: InventoryRow, rawInput?: string) => {
    const draft =
      rawInput ??
      approvedQtyDraftBySku[row.sku] ??
      (() => {
        const qty = Number(approvedQtyBySku[row.sku] ?? row.qtyApproved ?? 0);
        return qty > 0 ? String(qty) : "";
      })();
    const rawValue =
      draft === undefined || draft.trim() === "" ? 0 : Number(draft.trim());
    const safeRawValue = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
    const nextValue = roundToNearestUom(safeRawValue, row.uom);

    if (safeRawValue > 0 && nextValue !== safeRawValue) {
      showUomNotice(row.sku, row.uom);
    }

    setApprovedQtyDraftBySku((prev) => {
      const next = { ...prev };
      delete next[row.sku];
      return next;
    });
    setApprovedQtyBySku((prev) => ({ ...prev, [row.sku]: nextValue }));
    void saveApprovedQty(row, nextValue);
  };

  const bumpQty = (row: InventoryRow, direction: 1 | -1) => {
    const step = Number.isFinite(row.uom) && row.uom > 0 ? row.uom : 1;
    const rawCurrent = getApprovedQtyNumber(row);
    const current = rawCurrent > 0 ? roundToNearestUom(rawCurrent, row.uom) : 0;
    const nextValue = Math.max(0, current + direction * step);

    setActiveApprovedSku(row.sku);
    setApprovedQtyDraftBySku((prev) => {
      const next = { ...prev };
      delete next[row.sku];
      return next;
    });
    setApprovedQtyBySku((prev) => ({ ...prev, [row.sku]: nextValue }));
    void saveApprovedQty(row, nextValue);
  };

  const setColumnFilter = (key: ColumnFilterKey, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const headers: { label: string; key: ColumnFilterKey; align?: string; width: string }[] = [
    { label: "Product Title", key: "productTitle", width: "w-[230px]" },
    { label: "Variant", key: "variantTitle", width: "w-[120px]" },
    { label: "SKU", key: "sku", width: "w-[115px]" },
    { label: "Vendor", key: "vendor", width: "w-[140px]" },
    { label: "Qty", key: "currentQty", align: "text-right", width: "w-[65px]" },
    { label: "On Order", key: "onOrder", align: "text-right", width: "w-[78px]" },
    { label: "90D Sales", key: "sell90Day", align: "text-right", width: "w-[82px]" },
    { label: "Weekly", key: "weeklyRate", align: "text-right", width: "w-[70px]" },
    { label: "Needed", key: "qtyNeeded", align: "text-right", width: "w-[75px]" },
    { label: "Approved", key: "qtyApproved", width: "w-[190px]" },
    { label: "Days", key: "daysOfInventory", align: "text-right", width: "w-[65px]" },
    ...(showLeadColumns
      ? [
          { label: "LEAD TIME", key: "leadTime" as ColumnFilterKey, width: "w-[95px]" },
          { label: "REVIEW PERIOD", key: "reviewPeriod" as ColumnFilterKey, width: "w-[115px]" },
        ]
      : []),
    { label: "Update", key: "status", width: "w-[105px]" },
  ];

  return (
      <div className="space-y-4" onClick={() => {
        setActiveApprovedSku(null);
        setOpenDropdown(null);
      }}>
      <PageTitle
        title="Days of Inventory"
        description="Track stock levels, forecasting, vendor distribution, and inventory health."
      />

      {/* Top Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative w-[20ch] shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-700">Date:</label>
              <select
                value={effectiveDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  void loadShopifyInventory(false, e.target.value);
                }}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-slate-900"
              >
                {dates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowScheduleFields(false);
                setSyncModalOpen(true);
              }}
              disabled={syncingShopify}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={syncingShopify ? "animate-spin" : ""} />
              {syncingShopify ? "Syncing..." : "Sync Shopify"}
            </button>

            <button
              type="button"
              onClick={() => setShowLeadColumns((show) => !show)}
              className={`flex h-9 items-center rounded-lg border px-3 text-xs font-semibold ${
                showLeadColumns
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Show Lead Time
            </button>

            <button
              type="button"
              onClick={() => setShowHighDaysOnly((show) => !show)}
              className={`flex h-9 items-center rounded-lg border px-3 text-xs font-semibold ${
                showHighDaysOnly
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Show 40D +
            </button>

            <button
              type="button"
              onClick={downloadExcel}
              disabled={loadingInventory || dateRows.length === 0}
              title="Download Excel"
              aria-label="Download Excel"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
            </button>
        </div>
        {inventoryMessage && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            inventoryMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {inventoryMessage.text}
          </div>
        )}
      </div>

      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Shopify Sync</h2>
              <button type="button" onClick={() => setSyncModalOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={syncShopifyInventory}
                  disabled={syncingShopify}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={16} className={syncingShopify ? "animate-spin" : ""} />
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleFields(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <CalendarClock size={16} />
                  Schedule
                </button>
              </div>

              {showScheduleFields && (
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Time</label>
                    <select
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    >
                      {SYNC_TIME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Frequency</label>
                    <select
                      value={scheduleFrequency}
                      onChange={(event) => setScheduleFrequency(event.target.value as SyncFrequency)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom days</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Days</label>
                    <div className="mt-2 grid grid-cols-7 gap-2">
                      {[
                        { label: "S", value: "S" },
                        { label: "M", value: "M" },
                        { label: "T", value: "T" },
                        { label: "W", value: "W" },
                        { label: "T", value: "T2" },
                        { label: "F", value: "F" },
                        { label: "S", value: "S2" },
                      ].map((day) => {
                        const selected = scheduleFrequency === "daily" || scheduleDays.includes(day.value);

                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleScheduleDay(day.value)}
                            disabled={scheduleFrequency === "daily"}
                            className={`h-10 rounded-xl border text-sm font-semibold ${
                              selected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 text-slate-700 hover:bg-slate-50"
                            } disabled:cursor-not-allowed`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void saveSyncSchedule()}
                    disabled={
                      savingSchedule ||
                      (scheduleFrequency !== "daily" && scheduleDays.length === 0)
                    }
                    className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingSchedule ? "Saving..." : "Save schedule"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activePoVendor ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() => {
                  setActivePoVendor(null);
                  setSavedPoNumber("");
                  setEmailPreviewOpen(false);
                  setPdfPreviewOpen(false);
                }}
                className="mb-2 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft size={14} />
                Back to Days of Inventory
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                {activePoVendor}
              </h2>
              <p className="text-xs text-slate-500">
                Approved items only. Rows with 0 approved quantity are ignored.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void savePurchaseOrder()}
                disabled={poRows.length === 0}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={14} />
                {savedPoNumber ? "Update PO" : "Create PO"}
              </button>
              {activeVendorUsesPdf && (
                <>
                <button
                  type="button"
                  onClick={() => setPdfPreviewOpen(true)}
                  disabled={poRows.length === 0 || !pdfOrderPreview}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText size={14} />
                  Preview PDF
                </button>
                <button
                  type="button"
                  onClick={() => generatePurchaseOrderPdf("download")}
                  disabled={poRows.length === 0 || !pdfOrderPreview}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={14} />
                  Download PDF
                </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditedEmailTo(emailPreview.to);
                  setEditedEmailSubject(emailPreview.subject);
                  setEditedEmailBody(emailPreview.bodyText);
                  setEmailPreviewOpen(true);
                }}
                disabled={poRows.length === 0}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">PO Number</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {savedPoNumber || "Not saved"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">Total Approved Qty</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {poApprovedTotal}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">Order to</p>
              <button
                type="button"
                onClick={openOrderDestination}
                className="mt-1 inline-flex h-8 max-w-full items-center gap-2 rounded-lg border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {activeVendorDetails?.order_at.toLowerCase().includes("website") ? (
                  <Globe size={14} />
                ) : (
                  <Mail size={14} />
                )}
                <span className="truncate">
                  {getOrderAtLabel(activeVendorDetails?.order_at)}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="w-[240px] px-2.5 py-2 text-left font-semibold">
                    Product
                  </th>
                  <th className="w-[120px] px-2.5 py-2 text-left font-semibold">
                    Variant
                  </th>
                  <th className="w-[120px] px-2.5 py-2 text-left font-semibold">
                    SKU
                  </th>
                  <th className="w-[90px] px-2.5 py-2 text-right font-semibold">
                    Approved
                  </th>
                </tr>
              </thead>
              <tbody>
                {poRows.map((row) => (
                  <tr key={row.sku} className="border-t border-slate-100">
                    <td className="px-2.5 py-2.5">
                      <div className="truncate" title={row.productTitle}>
                        {row.productTitle}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="truncate" title={row.variantTitle}>
                        {row.variantTitle}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 font-medium text-slate-700">
                      <div className="truncate" title={row.sku}>
                        {row.sku}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-semibold tabular-nums">
                      {getApprovedQty(row)}
                    </td>
                  </tr>
                ))}
                {poRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No approved quantities for this vendor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {headers.map((h) => (
                  <th key={h.label} className={`${h.width} whitespace-nowrap px-2.5 py-2 text-left font-semibold ${h.align ?? ""}`}>
                      <div className="relative" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          disabled={loadingInventory || inventoryRows.length === 0}
                          onClick={() => setOpenDropdown(openDropdown === h.key ? null : h.key)}
                          className={`flex items-center gap-1 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45 ${h.align === "text-right" ? "ml-auto justify-end" : ""}`}
                        >
                          {h.label}
                          <ChevronDown size={14} className={`transition-transform ${openDropdown === h.key ? "rotate-180" : ""}`} />
                          {columnFilters[h.key] !== "All" && (
                            <span className="ml-1 max-w-16 truncate rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">
                              {columnFilters[h.key]}
                            </span>
                          )}
                        </button>
                        {openDropdown === h.key && (
                          <div className="absolute left-0 top-full z-50 mt-1 max-h-64 min-w-[190px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <button type="button" onClick={() => setColumnFilter(h.key, "All")} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">All</button>
                            {uniqueValues(h.key).map((val) => (
                              <button key={val} type="button" onClick={() => setColumnFilter(h.key, val)} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">{val}</button>
                            ))}
                          </div>
                        )}
                      </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loadingInventory && (
                <tr>
                  <td colSpan={headers.length} className="px-5 py-8 text-center text-sm text-slate-500">Loading Shopify inventory...</td>
                </tr>
              )}
              {!loadingInventory && sortedRows.map((row, index) => {
                const isActive = activeApprovedSku === row.sku;
                const showApprovedControls = isActive || hoveredApprovedSku === row.sku;
                const nextRow = sortedRows[index + 1];
                const isLastInVendorGroup =
                  !nextRow || getVendorGroup(nextRow.vendor) !== getVendorGroup(row.vendor);
                return (
                  <tr
                    key={row.sku}
                    className={`border-t border-slate-100 hover:bg-slate-50 ${
                      isLastInVendorGroup ? "border-b-4 border-b-slate-300" : ""
                    }`}
                  >
                    <td className="px-2.5 py-2.5"><div className="truncate" title={row.productTitle}>{row.productTitle}</div></td>
                    <td className="px-2.5 py-2.5"><div className="truncate" title={row.variantTitle}>{row.variantTitle}</div></td>
                    <td className="px-2.5 py-2.5 font-medium text-slate-700"><div className="truncate" title={row.sku}>{row.sku}</div></td>
                    <td className="px-2.5 py-2.5"><div className="truncate" title={row.vendor}>{row.vendor}</div></td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{row.currentQty}</td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{row.onOrder}</td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{row.sell90Day}</td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{row.weeklyRate}</td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-semibold tabular-nums">{row.qtyNeeded}</td>
                    <td
                      className="overflow-visible px-2.5 py-2.5"
                      onMouseEnter={() => setHoveredApprovedSku(row.sku)}
                      onMouseLeave={() => setHoveredApprovedSku(null)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="relative flex items-center justify-center gap-1.5">
                        <div className={`flex min-w-[116px] overflow-hidden rounded-lg border bg-white ${isActive ? "border-slate-900" : "border-slate-300"}`}>
                          {showApprovedControls && (
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => bumpQty(row, -1)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center border-r border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              <Minus size={12} />
                            </button>
                          )}
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={getApprovedDisplayValue(row)}
                            onFocus={() => beginApprovedQtyEdit(row)}
                            onClick={() => beginApprovedQtyEdit(row)}
                            onChange={(e) => setApprovedQty(row.sku, e.target.value.replace(/[^\d]/g, ""))}
                            onBlur={(event) => {
                              commitApprovedQty(row, event.currentTarget.value);
                              setActiveApprovedSku(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                commitApprovedQty(row, event.currentTarget.value);
                                event.currentTarget.blur();
                                return;
                              }

                              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                                event.preventDefault();
                                bumpQty(row, event.key === "ArrowRight" ? 1 : -1);
                                return;
                              }

                              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                                event.preventDefault();
                                commitApprovedQty(row, event.currentTarget.value);
                                const nextIndex =
                                  index + (event.key === "ArrowDown" ? 1 : -1);
                                window.requestAnimationFrame(() => {
                                  const nextInput = document.querySelector<HTMLInputElement>(
                                    `[data-approved-index="${nextIndex}"]`
                                  );
                                  nextInput?.focus();
                                  nextInput?.select();
                                });
                              }
                            }}
                            data-approved-index={index}
                            placeholder=""
                            className="h-7 min-w-0 flex-1 border-0 bg-white px-1 text-center text-xs font-semibold outline-none"
                          />
                          {showApprovedControls && (
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => bumpQty(row, 1)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center border-l border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                        {uomNoticeSku === row.sku && (
                          <span className="whitespace-nowrap text-[10px] font-semibold text-red-600">
                            UOM is {row.uom}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{row.daysOfInventory}</td>
                    {showLeadColumns && (
                      <>
                        <td className="whitespace-nowrap px-2.5 py-2.5"><div className="truncate" title={row.leadTime}>{row.leadTime || "-"}</div></td>
                        <td className="whitespace-nowrap px-2.5 py-2.5"><div className="truncate" title={row.reviewPeriod}>{row.reviewPeriod || "-"}</div></td>
                      </>
                    )}
                    <td className="whitespace-nowrap px-2.5 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePoVendor(row.vendor);
                          setEmailPreviewOpen(false);
                        }}
                        className="inline-flex h-7 w-full items-center justify-center rounded-lg border border-slate-300 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loadingInventory && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={headers.length} className="px-5 py-8 text-center text-sm text-slate-500">No inventory items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {pdfPreviewOpen && activePoVendor && pdfOrderPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  PDF Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Header details from PDF Config Fields and mapped line items.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPdfPreviewOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-5 text-sm">
              <div
                className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-slate-900"
                dangerouslySetInnerHTML={{ __html: pdfOrderPreview.fullHtml }}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setPdfPreviewOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => generatePurchaseOrderPdf("download")}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {emailPreviewOpen && activePoVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Email Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Confirm the final email format before sending.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmailPreviewOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">From</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                  {emailPreview.from}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">To</p>
                <input
                  type="text"
                  value={editedEmailTo}
                  onChange={(e) => setEditedEmailTo(e.target.value)}
                  placeholder="recipient@example.com, another@example.com"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Subject</p>
                <input
                  type="text"
                  value={editedEmailSubject}
                  onChange={(e) => setEditedEmailSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Body</p>
                <textarea
                  value={editedEmailBody}
                  onChange={(e) => setEditedEmailBody(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              {emailPreview.usesPdfFormat && (
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  {pdfOrderPreview &&
                  pdfFileByPoNumber[pdfOrderPreview.poNumber]
                    ? `Attached PDF with reference PO# ${pdfOrderPreview.poNumber}.`
                    : "No PDF on file."}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setEmailPreviewOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void sendPurchaseOrderEmail()}
                disabled={sendingEmail || !editedEmailTo}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
