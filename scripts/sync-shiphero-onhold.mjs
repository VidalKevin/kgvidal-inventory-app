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
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
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
  if (page.url().includes("/dashboard/orders")) {
    return;
  }

  console.log("Log in to ShipHero in the browser window if prompted.");
  await page.waitForURL("**/dashboard/orders**", {
    timeout: 5 * 60 * 1000,
  });
}

async function selectAllVisibleRows(page) {
  // ShipHero orders table row-count selector — adjust name if different
  const lengthSelect = page.locator('select[name="orders_length"], select[name="order_length"]');

  if ((await lengthSelect.count()) >= 1) {
    await lengthSelect.first().selectOption("1000");
    await page.waitForTimeout(2500);
  }
}

async function extractOnHoldOrders(page) {
  return page.evaluate(() => {
    // ShipHero Manage Orders table — inspect the page and update the selector if needed
    const tableSelectors = ["#orders_table", "#orders", "table"];
    let table = null;

    for (const sel of tableSelectors) {
      const found = document.querySelector(sel);
      if (found && found.querySelector("tbody tr")) {
        table = found;
        break;
      }
    }

    if (!table) {
      throw new Error("Could not find orders table. Check that the page has loaded with results.");
    }

    const headers = Array.from(table.querySelectorAll("thead th")).map(
      (th) => th.textContent.trim().replace(/\s+/g, " ").toLowerCase()
    );

    console.log("Headers found:", headers.join(" | "));

    const colIndex = (keywords) => {
      for (const kw of keywords) {
        const idx = headers.findIndex((h) => h.includes(kw));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const dateIdx    = colIndex(["order date", "date"]);
    const orderIdx   = colIndex(["order #", "order number", "order no", "#"]);
    const nameIdx    = colIndex(["name", "first name", "ship name", "customer"]);
    const emailIdx   = colIndex(["email"]);
    const holdIdx    = colIndex(["hold", "on hold"]);

    const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) =>
        td.textContent.trim().replace(/\s+/g, " ")
      )
    );

    const orders = rows
      .filter((row) => row.length > 0 && row.some((cell) => cell !== ""))
      .map((row) => {
        const fullName = nameIdx >= 0 ? (row[nameIdx] || "") : "";
        const firstName = fullName.split(/\s+/)[0] || fullName;
        return {
          order_date:   dateIdx  >= 0 ? (row[dateIdx]  || null) : null,
          order_number: orderIdx >= 0 ? (row[orderIdx] || null) : null,
          first_name:   firstName || null,
          email:        emailIdx >= 0 ? (row[emailIdx] || null) : null,
          on_hold:      holdIdx  >= 0 ? (row[holdIdx]  || "Yes") : "Yes",
        };
      })
      .filter((o) => o.order_number || o.email);

    return {
      tableInfo: document.querySelector(".dataTables_info")?.textContent.trim(),
      totalRows: rows.length,
      orders,
    };
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

  const rows = orders.map((o) => ({ ...o, synced_at: syncedAt }));

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

  // ShipHero Manage Orders URL with filters:
  // - date range: last 30 days
  // - fulfillment_status: unfulfilled
  // - on_hold: 1 (Any Hold)
  // Inspect the ShipHero URL bar after applying filters manually and update these params if needed.
  const query = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    fulfillment_status: "unfulfilled",
    on_hold: "1",
  });

  await mkdir(sessionDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(sessionDir, {
    headless: false,
    acceptDownloads: true,
  });
  const page = browser.pages()[0] ?? (await browser.newPage());

  try {
    await page.goto(
      `https://app.shiphero.com/dashboard/orders?${query}`,
      { waitUntil: "domcontentloaded" }
    );
    await waitForShipheroLogin(page);
    await page.waitForSelector("table tbody tr", { timeout: 60000 });
    await selectAllVisibleRows(page);

    const result = await extractOnHoldOrders(page);
    const saved = await saveOrdersToSupabase(result.orders);

    console.log(
      JSON.stringify(
        {
          dateRange: { startDate, endDate },
          tableInfo: result.tableInfo,
          totalRows: result.totalRows,
          ordersExtracted: result.orders.length,
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
