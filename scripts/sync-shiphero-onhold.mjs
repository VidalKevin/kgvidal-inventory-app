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

function toIsoDate(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const match = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);

  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;

  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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
  await page.waitForTimeout(1500);

  if (page.url().includes("app.shiphero.com/dashboard/orders")) {
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
    await page.locator('input[type="password"], input[name="password"]').first().fill(password);
    await page
      .getByRole("button", { name: /continue|log in|login|sign in/i })
      .first()
      .click();
    await page.waitForURL("**/dashboard/orders**", {
      timeout: 2 * 60 * 1000,
    });
    await page.waitForLoadState("domcontentloaded");
    return;
  }

  if (process.env.SHIPHERO_HEADLESS === "true") {
    throw new Error(
      "ShipHero session is not logged in. Add SHIPHERO_EMAIL and SHIPHERO_PASSWORD GitHub secrets, or run this sync locally once with the visible browser and log in."
    );
  }

  console.log("Log in to ShipHero in the browser window if prompted.");
  await page.waitForURL("**/dashboard/orders**", {
    timeout: 5 * 60 * 1000,
  });
  await page.waitForLoadState("domcontentloaded");
}

async function selectAllVisibleRows(page) {
  const lengthSelect = page.locator(
    'select[name="orders_length"], select[name="order_length"]'
  );

  if ((await lengthSelect.count()) >= 1) {
    await lengthSelect.first().selectOption("1000");
    await page.waitForTimeout(2500);
  }
}

async function waitForManageOrdersResults(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2500);
  await page.waitForFunction(
    () => {
      const bodyText = document.body?.textContent ?? "";
      const noResults = /no matching records|no data available|showing 0 to 0|0 entries/i.test(
        bodyText
      );
      const tableReady = Array.from(document.querySelectorAll("table")).some((table) => {
        const tableText = table.textContent?.toLowerCase() ?? "";
        const hasOrderHeaders =
          tableText.includes("order") ||
          tableText.includes("customer") ||
          tableText.includes("email") ||
          tableText.includes("hold");

        return hasOrderHeaders && table.querySelector("tbody");
      });

      return noResults || tableReady;
    },
    null,
    { timeout: 90000 }
  );
}

async function selectOptionByText(page, optionText) {
  const selects = page.locator("select");
  const count = await selects.count();

  for (let index = 0; index < count; index += 1) {
    const select = selects.nth(index);
    const value = await select.evaluate((element, text) => {
      const options = Array.from(element.options);
      const option = options.find((item) =>
        item.textContent
          ?.trim()
          .toLowerCase()
          .includes(String(text).toLowerCase())
      );

      return option?.value ?? null;
    }, optionText);

    if (value) {
      await select.selectOption(value);
      await page.waitForTimeout(800);
      return true;
    }
  }

  return false;
}

async function applyManageOrderFilters(page) {
  await selectOptionByText(page, "Unfulfilled");
  await selectOptionByText(page, "Any Hold");
}

async function extractOnHoldOrders(page) {
  return page.evaluate(() => {
    const bodyText = document.body?.textContent ?? "";
    const noResults = /no matching records|no data available|showing 0 to 0|0 entries/i.test(
      bodyText
    );
    const tableSelectors = ["#orders_table", "#orders", "table"];
    const tables = [];

    for (const selector of tableSelectors) {
      document.querySelectorAll(selector).forEach((found) => {
        if (!tables.includes(found)) {
          tables.push(found);
        }
      });
    }

    const normalize = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
    const tableScore = (table) => {
      const text = normalize(table.textContent ?? "");
      let score = 0;
      if (text.includes("order")) score += 3;
      if (text.includes("email")) score += 2;
      if (text.includes("hold")) score += 2;
      if (text.includes("customer") || text.includes("recipient")) score += 1;
      if (table.querySelector("tbody tr")) score += 1;
      return score;
    };

    const table = tables
      .filter((found) => found.querySelector("tbody"))
      .sort((left, right) => tableScore(right) - tableScore(left))[0];

    if (!table && noResults) {
      return {
        tableInfo: document.querySelector(".dataTables_info")?.textContent.trim(),
        totalRows: 0,
        headers: [],
        orders: [],
      };
    }

    if (!table) {
      throw new Error(
        `Could not find orders table. URL: ${location.href}. Page title: ${document.title}.`
      );
    }

    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      normalize(th.textContent)
    );

    const colIndex = (keywords) => {
      for (const keyword of keywords) {
        const index = headers.findIndex((header) => header.includes(keyword));

        if (index >= 0) {
          return index;
        }
      }

      return -1;
    };

    const dateIndex = colIndex(["order date", "date"]);
    const orderIndex = colIndex(["order #", "order number", "order no", "#"]);
    const nameIndex = colIndex([
      "first name",
      "customer",
      "recipient",
      "ship name",
      "name",
    ]);
    const emailIndex = colIndex(["email"]);
    const holdIndex = colIndex(["on hold", "hold"]);
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

    const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td")).map((td) =>
        td.textContent.trim().replace(/\s+/g, " ")
      );

      return {
        cells,
        text: tr.textContent.trim().replace(/\s+/g, " "),
      };
    });

    const orders = rows
      .filter((row) => row.cells.length > 0 && row.cells.some(Boolean))
      .map((row) => {
        const fullName = nameIndex >= 0 ? row.cells[nameIndex] || "" : "";
        const firstName = fullName.split(/\s+/)[0] || fullName;
        const emailMatch =
          emailIndex >= 0
            ? row.cells[emailIndex]?.match(emailPattern)
            : row.text.match(emailPattern);

        return {
          order_date: dateIndex >= 0 ? row.cells[dateIndex] || null : null,
          order_number:
            orderIndex >= 0 ? row.cells[orderIndex] || null : null,
          first_name: firstName || null,
          email: emailMatch?.[0] ?? null,
          on_hold:
            holdIndex >= 0 ? row.cells[holdIndex] || "Any Hold" : "Any Hold",
        };
      })
      .filter((order) => order.order_number || order.email);

    return {
      tableInfo: document.querySelector(".dataTables_info")?.textContent.trim(),
      totalRows: rows.length,
      headers,
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

  const rows = orders.map((order) => ({
    order_date: toIsoDate(order.order_date),
    order_number: order.order_number,
    first_name: order.first_name,
    email: order.email,
    on_hold: order.on_hold,
    synced_at: syncedAt,
  }));

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
  const query = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    order_date_start: startDate,
    order_date_end: endDate,
    fulfillment_status: "unfulfilled",
    order_fulfillment_status: "unfulfilled",
    on_hold: "1",
    hold: "any",
  });

  await mkdir(sessionDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(sessionDir, {
    headless: process.env.SHIPHERO_HEADLESS === "true",
    acceptDownloads: true,
  });
  const page = browser.pages()[0] ?? (await browser.newPage());

  try {
    await page.goto(
      `https://app.shiphero.com/dashboard/orders/v2/manage?${query}`,
      { waitUntil: "domcontentloaded" }
    );
    await waitForShipheroLogin(page);
    await applyManageOrderFilters(page);
    await waitForManageOrdersResults(page);
    await selectAllVisibleRows(page);
    await waitForManageOrdersResults(page);

    const result = await extractOnHoldOrders(page);
    const saved = await saveOrdersToSupabase(result.orders);

    console.log(
      JSON.stringify(
        {
          dateRange: { startDate, endDate },
          tableInfo: result.tableInfo,
          totalRows: result.totalRows,
          headers: result.headers,
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
