export type PdfSkuMapping = {
  sku: string;
  itemSku: string;
  itemName: string;
};

export type PdfFormField = {
  key?: string;
  label: string;
  value: string;
};

export type VendorPdfSettings = {
  emailSubject?: string;
  emailBody?: string;
  pdfEmailBody?: string;
  pdfEnabled?: boolean;
  pdfSampleName?: string;
  pdfEditableFields?: string[];
  pdfFormFields?: PdfFormField[];
  pdfSkuMappings?: PdfSkuMapping[];
  tableColumns?: Array<{ header: string; field: string }>;
  email?: {
    attachmentFormat?: string;
    includeAttachment?: boolean;
  };
};

export type PdfOrderLineItem = {
  itemSku: string;
  itemName: string;
  qty: number;
};

export type PdfOrderPreview = {
  poNumber: string;
  vendorName: string;
  formFields: PdfFormField[];
  rows: PdfOrderLineItem[];
  fieldsHtml: string;
  rowsHtml: string;
  fullHtml: string;
};

const NUTRIDYN_PDF_SKU_MAPPINGS: PdfSkuMapping[] = [
  { sku: "Bind-Clear", itemSku: "PL-VL178", itemName: "Bind & Clear" },
  { sku: "1A002", itemSku: "PL-VL913", itemName: "Essential Zn" },
  { sku: "FatDigestVL", itemSku: "PL-VL863", itemName: "Fat Digest" },
  { sku: "GSE", itemSku: "PL-VL2176", itemName: "GSE Eradicate" },
  { sku: "1D002", itemSku: "PL-VL710", itemName: "Gut Lining Pro" },
  { sku: "1D003", itemSku: "PL-VL325", itemName: "Gut Tissue Repair" },
  { sku: "1D001", itemSku: "PL-VL915", itemName: "Hormone Plus Complete" },
  { sku: "1C005", itemSku: "PL-VL2178", itemName: "Mucosa Repair" },
  { sku: "Optimal-Andro", itemSku: "PL-VL918", itemName: "Optimal Androgens" },
  { sku: "1B005", itemSku: "PL-VL895", itemName: "Optimal Kidney Pro" },
  { sku: "1A001", itemSku: "PL-VL2196", itemName: "Pro Spore Plus" },
  { sku: "1B002", itemSku: "PL-VL848L", itemName: "Resolve 120 ct" },
  { sku: "1B001", itemSku: "PL-VL848", itemName: "Resolve 60ct" },
  { sku: "1C002", itemSku: "PL-VL2121", itemName: "Sinus Pro" },
  { sku: "1C004", itemSku: "PL-VL2193", itemName: "Stomach Relief" },
  { sku: "1A004", itemSku: "PL-VL154", itemName: "Tummy Rescue" },
  { sku: "Vida-C", itemSku: "PL-VL101", itemName: "VidaC 1000" },
];

function normalizeMatchKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isNutridynVendor(vendorName: string, vendorCode = "") {
  const vendorText = `${vendorName} ${vendorCode}`.toLowerCase();
  return vendorText.includes("nutridyn") || vendorText.includes("nutri-dyn");
}

export function getTodaySlashDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export function getDefaultPdfFormFields(
  vendorName: string,
  vendorCode = ""
): PdfFormField[] {
  const today = getTodaySlashDate();

  if (isNutridynVendor(vendorName, vendorCode)) {
    return [
      { key: "orderDate", label: "Order Date", value: today },
      { key: "accountNumber", label: "Account Number", value: "702613" },
      { key: "name", label: "Name", value: "Rhya Pachin" },
      { key: "businessName", label: "Business Name", value: "Vidal Nutrition" },
      {
        key: "shippingAddress",
        label: "Shipping Address",
        value: "11915 Enterprise Drive\nCincinnati, OH 45241",
      },
      {
        key: "billingAddress",
        label: "Billing Address",
        value: "11365 Sixth Street East, Treasure Island, FL 33706",
      },
      {
        key: "paymentMethod",
        label: "Payment Method",
        value: "Card ending with 1329",
      },
      {
        key: "notes",
        label: "Notes",
        value: "All Private Labeled items for Vidal",
      },
    ];
  }

  return [
    { key: "orderDate", label: "Order Date", value: today },
    { key: "accountNumber", label: "Account Number", value: "" },
    { key: "shippingAddress", label: "Shipping Address", value: "" },
    { key: "billingAddress", label: "Billing Address", value: "" },
    { key: "paymentMethod", label: "Payment Method", value: "" },
    { key: "notes", label: "Notes", value: "" },
  ];
}

export function normalizeVendorPdfSettings(
  settings: VendorPdfSettings | null | undefined,
  vendorName: string,
  vendorCode = ""
): Required<
  Pick<
    VendorPdfSettings,
    "pdfEnabled" | "pdfFormFields" | "pdfSkuMappings" | "pdfEmailBody"
  >
> &
  VendorPdfSettings {
  const defaults = getDefaultPdfFormFields(vendorName, vendorCode);
  const defaultMappings = isNutridynVendor(vendorName, vendorCode)
    ? NUTRIDYN_PDF_SKU_MAPPINGS
    : [];

  return {
    ...settings,
    pdfEnabled: Boolean(settings?.pdfEnabled),
    pdfEmailBody:
      settings?.pdfEmailBody?.trim() ||
      "Hi {{contact}},\n\nKindly see attached for our order this week.\n\nThanks",
    pdfFormFields:
      Array.isArray(settings?.pdfFormFields) && settings.pdfFormFields.length > 0
        ? settings.pdfFormFields.map((field) =>
            field.key === "orderDate" && !field.value
              ? { ...field, value: getTodaySlashDate() }
              : field
          )
        : defaults,
    pdfSkuMappings:
      Array.isArray(settings?.pdfSkuMappings) && settings.pdfSkuMappings.length > 0
        ? settings.pdfSkuMappings
        : defaultMappings,
  };
}

export function vendorUsesPdfFormat(
  settings: VendorPdfSettings | null | undefined
) {
  if (!settings) {
    return false;
  }

  if (settings.pdfEnabled) {
    return true;
  }

  return (
    settings.email?.attachmentFormat === "pdf" ||
    (settings.email?.includeAttachment === true &&
      settings.email?.attachmentFormat === "pdf")
  );
}

function findPdfSkuMapping(
  sku: string,
  productTitle: string,
  variantTitle: string,
  mappings: PdfSkuMapping[]
) {
  const skuKey = normalizeMatchKey(sku);
  const bySku = mappings.find(
    (mapping) => normalizeMatchKey(mapping.sku) === skuKey
  );

  if (bySku) {
    return bySku;
  }

  const productKey = normalizeMatchKey(productTitle);
  const byProduct = mappings.find(
    (mapping) => normalizeMatchKey(mapping.itemName) === productKey
  );

  if (byProduct) {
    return byProduct;
  }

  const itemName =
    variantTitle && variantTitle !== "Default Title"
      ? `${productTitle} - ${variantTitle}`
      : productTitle;

  return {
    sku,
    itemSku: sku || "-",
    itemName,
  };
}

export function buildPdfOrderLineItems(
  rows: Array<{
    sku: string;
    productTitle: string;
    variantTitle: string;
    qty: number;
  }>,
  mappings: PdfSkuMapping[]
): PdfOrderLineItem[] {
  return rows.map((row) => {
    const mapped = findPdfSkuMapping(
      row.sku,
      row.productTitle,
      row.variantTitle,
      mappings
    );

    return {
      itemSku: mapped.itemSku || row.sku || "-",
      itemName: mapped.itemName,
      qty: row.qty,
    };
  });
}

export function buildPdfPreviewHtml(
  poNumber: string,
  vendorName: string,
  formFields: PdfFormField[],
  rows: PdfOrderLineItem[]
) {
  const fieldsHtml = formFields.length
    ? `<table style="border-collapse:collapse;margin-bottom:16px;width:100%;max-width:760px;"><tbody>${formFields
        .map(
          (field) =>
            `<tr><td style="border:1px solid #1f2937;padding:6px 8px;font-weight:700;width:34%;vertical-align:top;">${escapeHtml(field.label)}</td><td style="border:1px solid #1f2937;padding:6px 8px;white-space:pre-line;">${escapeHtml(field.value || "-")}</td></tr>`
        )
        .join("")}</tbody></table>`
    : "";

  const rowsHtml = `
    <table style="border-collapse:collapse;width:100%;max-width:760px;">
      <thead>
        <tr>
          <th style="border:1px solid #1f2937;background:#1f5f8b;color:#ffffff;padding:5px 8px;text-align:left;">Item SKU # / Private label SKU #</th>
          <th style="border:1px solid #1f2937;background:#1f5f8b;color:#ffffff;padding:5px 8px;text-align:left;">Item Name (Flavor):</th>
          <th style="border:1px solid #1f2937;background:#1f5f8b;color:#ffffff;padding:5px 8px;text-align:right;">Item Quantity:</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr><td style="border:1px solid #1f2937;padding:5px 8px;">${escapeHtml(row.itemSku)}</td><td style="border:1px solid #1f2937;padding:5px 8px;">${escapeHtml(row.itemName)}</td><td style="border:1px solid #1f2937;padding:5px 8px;text-align:right;">${escapeHtml(row.qty)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const fullHtml = `
    <div style="font-family:Arial,sans-serif;color:#111827;">
      <h2 style="margin:0 0 8px;font-size:18px;">Purchase Order</h2>
      <p style="margin:0 0 4px;"><strong>PO Number:</strong> ${escapeHtml(poNumber)}</p>
      <p style="margin:0 0 16px;"><strong>Vendor:</strong> ${escapeHtml(vendorName)}</p>
      ${fieldsHtml}
      ${rowsHtml}
    </div>
  `;

  return { fieldsHtml, rowsHtml, fullHtml };
}

export function buildPdfOrderPreview(input: {
  poNumber: string;
  vendorName: string;
  settings: VendorPdfSettings | null | undefined;
  vendorCode?: string;
  rows: Array<{
    sku: string;
    productTitle: string;
    variantTitle: string;
    qty: number;
  }>;
}): PdfOrderPreview | null {
  const normalized = normalizeVendorPdfSettings(
    input.settings,
    input.vendorName,
    input.vendorCode
  );

  if (!vendorUsesPdfFormat(normalized)) {
    return null;
  }

  const formFields = normalized.pdfFormFields.filter((field) => field.label.trim());
  const lineItems = buildPdfOrderLineItems(input.rows, normalized.pdfSkuMappings);
  const html = buildPdfPreviewHtml(
    input.poNumber,
    input.vendorName,
    formFields,
    lineItems
  );

  return {
    poNumber: input.poNumber,
    vendorName: input.vendorName,
    formFields,
    rows: lineItems,
    ...html,
  };
}
