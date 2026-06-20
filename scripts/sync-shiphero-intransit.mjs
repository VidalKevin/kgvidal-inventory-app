import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sessionDir = path.join(projectRoot, ".shiphero-session");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    process.env[key.trim()] = process.env[key.trim()] ?? value;
  }
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

function getDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 90);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

function numberValue(value) {
  const parsed = Number(String(value ?? "0").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "Missing Playwright. Run `npm install -D playwright` before using this script."
    );
  }
}

function getSupabaseAdmin() {
  loadEnvFile(path.join(projectRoot, ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function waitForShipheroLogin(page) {
  if (page.url().includes("/dashboard/purchase-order-line-items")) {
    return;
  }

  const email = process.env.SHIPHERO_EMAIL;
  const password = process.env.SHIPHERO_PASSWORD;

  if (email && password) {
    await page
      .getByLabel(/email/i)
      .or(page.locator('input[type="email"], input[name="email"]').first())
      .fill(email);
    await page
      .getByRole("button", { name: /continue|next|log in|login/i })
      .first()
      .click();
    await page.waitForTimeout(1500);
    await page
      .getByLabel(/password/i)
      .or(page.locator('input[type="password"], input[name="password"]').first())
      .fill(password);
    await page
      .getByRole("button", { name: /continue|log in|login|sign in/i })
      .first()
      .click();
    await page.waitForURL("**/dashboard/purchase-order-line-items**", {
      timeout: 2 * 60 * 1000,
    });
    await page.waitForLoadState("domcontentloaded");
    return;
  }

  if (process.env.SHIPHERO_HEADLESS === "true") {
    throw new Error(
      "ShipHero session is not logged in. Add SHIPHERO_EMAIL and SHIPHERO_PASSWORD GitHub secrets, or run `npm run sync:shiphero-intransit` once from PowerShell to refresh the saved login session."
    );
  }

  console.log("Log in to Shiphero in the browser window if prompted.");
  await page.waitForURL("**/dashboard/purchase-order-line-items**", {
    timeout: 5 * 60 * 1000,
  });
}

async function selectAllVisibleRows(page) {
  const lengthSelect = page.locator('select[name="line_items_length"]');

  if ((await lengthSelect.count()) === 1) {
    await lengthSelect.selectOption("1000");
    await page.waitForTimeout(2500);
  }
}

async function extractIntransitTotals(page) {
  return page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll("#line_items thead th")).map(
      (th) => th.textContent.trim().replace(/\s+/g, " ")
    );
    const skuIndex = headers.indexOf("SKU");
    const quantityIndex = headers.indexOf("Quantity");
    const receivedIndex = headers.indexOf("Quantity Received");
    const lineStatusIndex = headers.indexOf("Line Item Status");
    const poStatusIndex = headers.indexOf("Purchase Order Status");

    if (skuIndex < 0 || quantityIndex < 0 || receivedIndex < 0) {
      throw new Error("Could not find SKU, Quantity, or Quantity Received columns.");
    }

    const rows = Array.from(document.querySelectorAll("#line_items tbody tr")).map(
      (tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) =>
          td.textContent.trim().replace(/\s+/g, " ")
        )
    );

    const totals = new Map();
    let includedRows = 0;

    for (const row of rows) {
      const sku = row[skuIndex];
      const quantity = Number(String(row[quantityIndex] ?? "0").replace(/,/g, ""));
      const received = Number(String(row[receivedIndex] ?? "0").replace(/,/g, ""));
      const lineStatus = String(row[lineStatusIndex] ?? "").trim().toLowerCase();
      const poStatus = String(row[poStatusIndex] ?? "").trim().toLowerCase();
      const closedLineStatuses = new Set(["received", "cancelled", "canceled", "closed"]);

      if (!sku || received !== 0) {
        continue;
      }

      if (poStatusIndex >= 0 && poStatus !== "pending") {
        continue;
      }

      if (lineStatusIndex >= 0 && closedLineStatuses.has(lineStatus)) {
        continue;
      }

      includedRows += 1;
      totals.set(sku, (totals.get(sku) ?? 0) + quantity);
    }

    return {
      tableInfo: document.querySelector("#line_items_info, .dataTables_info")?.textContent.trim(),
      includedRows,
      totals: Array.from(totals.entries()).map(([sku, quantity]) => ({
        sku,
        quantity,
      })),
    };
  });
}

async function saveTotalsToSupabase(totals) {
  const supabaseAdmin = getSupabaseAdmin();
  const syncedAt = new Date().toISOString();
  const rows = totals.map((row) => ({
    sku: row.sku,
    quantity: numberValue(row.quantity),
    source: "shiphero",
    synced_at: syncedAt,
  }));

  const { error: deleteError } = await supabaseAdmin
    .from("shiphero_intransit_items")
    .delete()
    .neq("sku", "");

  if (deleteError) {
    throw new Error(`Supabase Shiphero cleanup failed: ${deleteError.message}`);
  }

  if (rows.length === 0) {
    return { saved: 0, syncedAt };
  }

  const { error: insertError } = await supabaseAdmin
    .from("shiphero_intransit_items")
    .insert(rows);

  if (insertError) {
    throw new Error(`Supabase Shiphero insert failed: ${insertError.message}`);
  }

  return { saved: rows.length, syncedAt };
}

async function main() {
  const { chromium } = await getPlaywright();
  const { startDate, endDate } = getDateRange();
  const query = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    order_fulfillment_status: "pending",
  });

  await mkdir(sessionDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(sessionDir, {
    headless: process.env.SHIPHERO_HEADLESS === "true",
    acceptDownloads: true,
  });
  const page = browser.pages()[0] ?? (await browser.newPage());

  try {
    await page.goto(
      `https://app.shiphero.com/dashboard/purchase-order-line-items?${query}`,
      { waitUntil: "domcontentloaded" }
    );
    await waitForShipheroLogin(page);
    await page.waitForSelector("#line_items tbody tr", { timeout: 60000 });
    await selectAllVisibleRows(page);

    const result = await extractIntransitTotals(page);
    const saved = await saveTotalsToSupabase(result.totals);

    console.log(
      JSON.stringify(
        {
          dateRange: { startDate, endDate },
          tableInfo: result.tableInfo,
          includedRows: result.includedRows,
          skuCount: result.totals.length,
          saved,
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
