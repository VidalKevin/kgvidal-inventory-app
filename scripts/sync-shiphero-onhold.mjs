import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sessionDir = path.join(projectRoot, ".shiphero-session");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
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
  startDate.setDate(startDate.getDate() - 30);
  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

async function getPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error("Missing Playwright. Run `npm install -D playwright` before using this script.");
  }
}

function getSupabaseAdmin() {
  loadEnvFile(path.join(projectRoot, ".env.local"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function waitForShipheroLogin(page) {
  if (page.url().includes("/dashboard/orders")) return;
  console.log("Log in to ShipHero in the browser window if prompted.");
  await page.waitForURL("**/dashboard/orders**", { timeout: 5 * 60 * 1000 });
}

async function applyFilters(page, startDate, endDate) {
  // Wait for page to settle
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

  // Try applying date range filter via URL params first (ShipHero sometimes supports this)
  // Then interact with filter UI elements

  // Look for a date range filter input
  const dateFilterBtn = page.locator('button, [data-testid*="date"], [aria-label*="date"], [aria-label*="Date"]').first();
  if (await dateFilterBtn.count() > 0) {
    await dateFilterBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Look for fulfillment status filter
  const statusSelectors = [
    'select[name*="fulfillment"], select[name*="status"]',
    '[aria-label*="fulfillment"], [aria-label*="Fulfillment"]',
    'button:has-text("Fulfillment"), button:has-text("Status")',
  ];
  for (const selector of statusSelectors) {
    const el = page.locator(selector).first();
    if (await el.count() > 0) {
      await el.click().catch(() => {});
      await page.waitForTimeout(300);
      // Try selecting "Unfulfilled"
      const unfulfilledOption = page.locator('option:has-text("Unfulfilled"), li:has-text("Unfulfilled"), [data-value="unfulfilled"]').first();
      if (await unfulfilledOption.count() > 0) {
        await unfulfilledOption.click().catch(() => {});
      }
      break;
    }
  }

  // Look for "On Hold" / "Any Hold" checkbox or filter
  const holdSelectors = [
    'input[type="checkbox"][name*="hold"], input[type="checkbox"][id*="hold"]',
    'label:has-text("Hold") input[type="checkbox"]',
    '[aria-label*="hold"], [aria-label*="Hold"]',
    'button:has-text("Hold"), span:has-text("Any Hold")',
  ];
  for (const selector of holdSelectors) {
    const el = page.locator(selector).first();
    if (await el.count() > 0) {
      await el.click().catch(() => {});
      await page.waitForTimeout(500);
      break;
    }
  }

  await page.waitForTimeout(2000);
}

async function extractOnHoldOrders(page) {
  await page.waitForTimeout(1000);

  return page.evaluate(() => {
    // Find the orders table — try common ShipHero selectors
    const tableSelectors = [
      "#orders_table",
      "#orders",
      "table[id*='order']",
      ".orders-table table",
      "table",
    ];

    let table = null;
    for (const sel of tableSelectors) {
      const found = document.querySelector(sel);
      if (found) { table = found; break; }
    }

    if (!table) {
      // Try to extract from any visible table
      const tables = Array.from(document.querySelectorAll("table"));
      table = tables.find(t => t.querySelector("tbody tr")) || tables[0] || null;
    }

    if (!table) {
      return { orders: [], error: "No orders table found on page." };
    }

    const headers = Array.from(table.querySelectorAll("thead th, thead td")).map(
      th => th.textContent.trim().replace(/\s+/g, " ").toLowerCase()
    );

    // Map column indices
    const colIndex = (keywords) => {
      for (const kw of keywords) {
        const idx = headers.findIndex(h => h.includes(kw));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const dateIdx = colIndex(["order date", "date"]);
    const orderNumIdx = colIndex(["order #", "order number", "order no", "#"]);
    const nameIdx = colIndex(["name", "first name", "customer"]);
    const emailIdx = colIndex(["email"]);
    const holdIdx = colIndex(["hold", "on hold"]);

    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .map(tr => Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim().replace(/\s+/g, " ")))
      .filter(row => row.length > 0 && row.some(cell => cell !== ""));

    const orders = rows.map(row => {
      const fullName = nameIdx >= 0 ? (row[nameIdx] || "") : "";
      const firstName = fullName.split(/\s+/)[0] || fullName;
      return {
        order_date: dateIdx >= 0 ? (row[dateIdx] || null) : null,
        order_number: orderNumIdx >= 0 ? (row[orderNumIdx] || null) : null,
        first_name: firstName || null,
        email: emailIdx >= 0 ? (row[emailIdx] || null) : null,
        on_hold: holdIdx >= 0 ? (row[holdIdx] || null) : "Yes",
      };
    }).filter(o => o.order_number || o.email);

    return { orders, headers, totalRows: rows.length };
  });
}

async function saveOrdersToSupabase(orders) {
  const supabaseAdmin = getSupabaseAdmin();
  const syncedAt = new Date().toISOString();

  const { error: deleteError } = await supabaseAdmin
    .from("shiphero_onhold_orders")
    .delete()
    .neq("id", 0);

  if (deleteError) {
    throw new Error(`Supabase cleanup failed: ${deleteError.message}`);
  }

  if (orders.length === 0) {
    return { saved: 0, syncedAt };
  }

  const rows = orders.map(o => ({ ...o, synced_at: syncedAt }));

  const { error: insertError } = await supabaseAdmin
    .from("shiphero_onhold_orders")
    .insert(rows);

  if (insertError) {
    throw new Error(`Supabase insert failed: ${insertError.message}`);
  }

  return { saved: rows.length, syncedAt };
}

async function main() {
  const { chromium } = await getPlaywright();
  const { startDate, endDate } = getDateRange();

  await mkdir(sessionDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(sessionDir, {
    headless: false,
    acceptDownloads: true,
  });
  const page = browser.pages()[0] ?? (await browser.newPage());

  try {
    // Navigate to ShipHero Manage Orders with date and fulfillment filters via URL where supported
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      fulfillment_status: "unfulfilled",
      on_hold: "true",
    });

    await page.goto(
      `https://app.shiphero.com/dashboard/orders?${query}`,
      { waitUntil: "domcontentloaded" }
    );

    await waitForShipheroLogin(page);
    await applyFilters(page, startDate, endDate);

    // Wait for orders to load
    await page.waitForSelector("table tbody tr", { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const result = await extractOnHoldOrders(page);

    if (result.error) {
      console.warn("Warning:", result.error);
    }

    console.log(`Found ${result.totalRows ?? 0} rows, extracted ${result.orders?.length ?? 0} orders.`);
    if (result.headers) {
      console.log("Table headers:", result.headers.join(" | "));
    }

    const saved = await saveOrdersToSupabase(result.orders ?? []);

    console.log(JSON.stringify({
      dateRange: { startDate, endDate },
      totalRows: result.totalRows,
      ordersExtracted: result.orders?.length ?? 0,
      saved,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
