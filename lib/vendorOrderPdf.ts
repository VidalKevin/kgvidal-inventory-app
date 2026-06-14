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
  pdfTemplate?: string;
  pdfUnitPrice?: string | number;
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
  unitPrice?: number;
  total?: number;
};

export type PdfOrderPreview = {
  poNumber: string;
  vendorName: string;
  template?: string;
  unitPrice?: number;
  totalAmount?: number;
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

function mergePdfFormFields(defaults: PdfFormField[], existing: PdfFormField[]) {
  const usedExisting = new Set<number>();
  const merged = defaults.map((defaultField) => {
    const defaultKey = normalizeMatchKey(defaultField.key || defaultField.label);
    const existingIndex = existing.findIndex((field, index) => {
      if (usedExisting.has(index)) return false;
      return (
        normalizeMatchKey(field.key || field.label) === defaultKey ||
        normalizeMatchKey(field.label) === normalizeMatchKey(defaultField.label)
      );
    });

    if (existingIndex < 0) {
      return defaultField;
    }

    usedExisting.add(existingIndex);
    return {
      ...defaultField,
      ...existing[existingIndex],
      key: defaultField.key || existing[existingIndex].key,
      label: defaultField.label,
    };
  });
  const extras = existing.filter((field, index) => !usedExisting.has(index));
  return [...merged, ...extras];
}

export function isNutridynVendor(vendorName: string, vendorCode = "") {
  const vendorText = `${vendorName} ${vendorCode}`.toLowerCase();
  return vendorText.includes("nutridyn") || vendorText.includes("nutri-dyn");
}

export function isBondiPureVendor(vendorName: string, vendorCode = "") {
  const vendorText = `${vendorName} ${vendorCode}`.toLowerCase();
  return vendorText.includes("bondi");
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

  if (isBondiPureVendor(vendorName, vendorCode)) {
    return [
      { key: "purchaseOrderDate", label: "Purchase Order Date", value: today },
      { key: "deliveryDate", label: "Delivery Date", value: "" },
      { key: "purchaseOrderNumber", label: "Purchase Order Number", value: "" },
      {
        key: "deliveryAddress",
        label: "Delivery Address",
        value: "11915 Enterprise Drive\nCincinnati, OH\n45241, USA",
      },
      { key: "deliveryInstructions", label: "Delivery Instructions", value: "" },
      { key: "attention", label: "Attention", value: "David or Mendel" },
      { key: "telephone", label: "Telephone", value: "1 855 7372655" },
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
  const isBondi = isBondiPureVendor(vendorName, vendorCode);
  const savedFields =
    Array.isArray(settings?.pdfFormFields) && settings.pdfFormFields.length > 0
      ? settings.pdfFormFields
      : [];
  const filteredSavedFields = savedFields.filter(
    (field) => !isBondi || normalizeMatchKey(field.label) !== "taxamountusd"
  );
  const pdfFormFields =
    filteredSavedFields.length > 0
      ? (isBondi
          ? mergePdfFormFields(defaults, filteredSavedFields)
          : filteredSavedFields
        ).map((field) =>
          (field.key === "orderDate" || field.key === "purchaseOrderDate") &&
          !field.value
            ? { ...field, value: getTodaySlashDate() }
            : field
        )
      : defaults;

  return {
    ...settings,
    pdfEnabled: Boolean(settings?.pdfEnabled),
    pdfTemplate: isBondi
      ? "bondi-pure"
      : settings?.pdfTemplate || "default",
    pdfUnitPrice: settings?.pdfUnitPrice ?? (isBondi ? "37.50" : ""),
    pdfEmailBody:
      settings?.pdfEmailBody?.trim() ||
      "Hi {{contact}},\n\nKindly see attached for our order this week.\n\nThanks",
    pdfFormFields,
    pdfSkuMappings:
      Array.isArray(settings?.pdfSkuMappings) && settings.pdfSkuMappings.length > 0
        ? settings.pdfSkuMappings
        : defaultMappings,
  };
}

function toCurrencyNumber(value: unknown, fallback: number) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function vendorUsesPdfFormat(
  settings: VendorPdfSettings | null | undefined
) {
  return Boolean(settings?.pdfEnabled);
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

function sumQtyForSku(
  rows: Array<{
    sku: string;
    qty: number;
  }>,
  sku: string
) {
  const key = normalizeMatchKey(sku);
  return rows
    .filter((row) => normalizeMatchKey(row.sku) === key)
    .reduce((total, row) => total + Number(row.qty || 0), 0);
}

function buildBondiPureLineItems(
  rows: Array<{
    sku: string;
    qty: number;
  }>,
  unitPrice: number
): PdfOrderLineItem[] {
  const items = [
    {
      itemSku: "Bondipure",
      itemName: "Bondi Pure Single Pouch - Original Flavor",
      qty: sumQtyForSku(rows, "Bondipure"),
    },
    {
      itemSku: "Bondipure-2",
      itemName: "Bondi Pure Single Pouch - Green Apple Flavor",
      qty: sumQtyForSku(rows, "Bondipure-2"),
    },
  ];

  return items.map((item) => ({
    ...item,
    unitPrice,
    total: item.qty * unitPrice,
  }));
}

function getFieldValue(formFields: PdfFormField[], key: string, fallback = "") {
  const normalizedKey = normalizeMatchKey(key);
  const field = formFields.find(
    (item) =>
      normalizeMatchKey(item.key || "") === normalizedKey ||
      normalizeMatchKey(item.label) === normalizedKey
  );

  return field?.value || fallback;
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

export function buildBondiPurePdfPreviewHtml(
  poNumber: string,
  vendorName: string,
  formFields: PdfFormField[],
  rows: PdfOrderLineItem[],
  unitPrice: number
) {
  const purchaseOrderDate = getFieldValue(
    formFields,
    "purchaseOrderDate",
    getTodaySlashDate()
  );
  const deliveryDate = getFieldValue(formFields, "deliveryDate");
  const purchaseOrderNumber = getFieldValue(
    formFields,
    "purchaseOrderNumber",
    poNumber
  );
  const deliveryAddress = getFieldValue(formFields, "deliveryAddress");
  const deliveryInstructions = getFieldValue(formFields, "deliveryInstructions");
  const attention = getFieldValue(formFields, "attention");
  const telephone = getFieldValue(formFields, "telephone");
  const totalAmount = rows.reduce((total, row) => total + (row.total || 0), 0);

  const rowsHtml = `
    <table style="border-collapse:collapse;width:100%;max-width:760px;margin-top:28px;">
      <thead>
        <tr>
          <th style="border-bottom:1px solid #111827;padding:4px 8px;text-align:left;">Description</th>
          <th style="border-bottom:1px solid #111827;padding:4px 8px;text-align:right;">Quantity</th>
          <th style="border-bottom:1px solid #111827;padding:4px 8px;text-align:right;">Unit Price</th>
          <th style="border-bottom:1px solid #111827;padding:4px 8px;text-align:right;">Amount USD</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr><td style="padding:8px;">${escapeHtml(row.itemName)}</td><td style="padding:8px;text-align:right;">${escapeHtml(row.qty)}</td><td style="padding:8px;text-align:right;">${escapeHtml(formatCurrency(unitPrice))}</td><td style="padding:8px;text-align:right;">${escapeHtml(formatCurrency(row.total || 0))}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const fieldsHtml = `
    <div style="display:flex;justify-content:space-between;gap:24px;max-width:760px;">
      <div>
        <h2 style="margin:0 0 4px;font-size:20px;line-height:1.15;">PURCHASE ORDER</h2>
        <h3 style="margin:0;font-size:20px;line-height:1.15;">${escapeHtml(vendorName)}</h3>
      </div>
      <div style="font-size:12px;line-height:1.45;min-width:260px;">
        <div><strong>Purchase Order Date:</strong> ${escapeHtml(purchaseOrderDate)}</div>
        <div style="height:12px;"></div>
        <div><strong>Delivery Date:</strong> ${escapeHtml(deliveryDate)}</div>
        <div><strong>Purchase Order Number:</strong> ${escapeHtml(purchaseOrderNumber)}</div>
      </div>
    </div>
  `;

  const deliveryHtml = `
    <div style="margin-top:64px;max-width:760px;">
      <h3 style="font-size:16px;margin:0 0 16px;">DELIVERY DETAILS</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;font-size:12px;line-height:1.3;">
        <div>
          <strong>Delivery Address</strong><br/>
          <span style="white-space:pre-line;">${escapeHtml(deliveryAddress)}</span>
          ${
            deliveryInstructions
              ? `<br/><br/><strong>Delivery Instructions:</strong><br/><span style="white-space:pre-line;">${escapeHtml(deliveryInstructions)}</span>`
              : ""
          }
        </div>
        <div>
          <strong>Attention</strong><br/>
          <span style="white-space:pre-line;">${escapeHtml(attention)}</span><br/>
          <strong>Telephone</strong><br/>
          <span style="white-space:pre-line;">${escapeHtml(telephone)}</span>
        </div>
      </div>
    </div>
  `;

  const fullHtml = `
    <div style="font-family:Arial,sans-serif;color:#000;max-width:820px;">
      ${fieldsHtml}
      ${rowsHtml}
      <p style="margin-top:28px;font-weight:700;">Total: ${escapeHtml(formatCurrency(totalAmount))} USD</p>
      ${deliveryHtml}
    </div>
  `;

  return {
    fieldsHtml,
    rowsHtml: `${rowsHtml}<p style="margin-top:28px;font-weight:700;">Total: ${escapeHtml(formatCurrency(totalAmount))} USD</p>${deliveryHtml}`,
    fullHtml,
  };
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
  const isBondi = normalized.pdfTemplate === "bondi-pure";
  const unitPrice = toCurrencyNumber(normalized.pdfUnitPrice, 37.5);
  const lineItems = isBondi
    ? buildBondiPureLineItems(input.rows, unitPrice)
    : buildPdfOrderLineItems(input.rows, normalized.pdfSkuMappings);
  const html = buildPdfPreviewHtml(
    input.poNumber,
    input.vendorName,
    formFields,
    lineItems
  );
  const finalHtml = isBondi
    ? buildBondiPurePdfPreviewHtml(
        input.poNumber,
        input.vendorName,
        formFields,
        lineItems,
        unitPrice
      )
    : html;

  return {
    poNumber: input.poNumber,
    vendorName: input.vendorName,
    template: normalized.pdfTemplate,
    unitPrice,
    totalAmount: lineItems.reduce((total, row) => total + (row.total || 0), 0),
    formFields,
    rows: lineItems,
    ...finalHtml,
  };
}
