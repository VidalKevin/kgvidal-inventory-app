import { NextResponse } from "next/server";

const SNAPSHOT_DATE = "2026-06-17";

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
  status: "Healthy" | "Low Stocks" | "Critical";
  leadTime: string;
  reviewPeriod: string;
  leadTimeWeeks: number;
  reviewPeriodWeeks: number;
  uom: number;
};

const MOCK_ROWS: InventoryRow[] = [
  {
    date: SNAPSHOT_DATE,
    productTitle: "Protein Powder",
    variantTitle: "Chocolate",
    sku: "ALPHA-001",
    vendor: "Alpha Nutrition",
    currentQty: 245,
    onOrder: 100,
    sell90Day: 320,
    weeklyRate: 25,
    qtyNeeded: 75,
    qtyApproved: 0,
    daysOfInventory: 28,
    status: "Healthy",
    leadTime: "2 weeks",
    reviewPeriod: "1 week",
    leadTimeWeeks: 2,
    reviewPeriodWeeks: 1,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Protein Powder",
    variantTitle: "Vanilla",
    sku: "ALPHA-002",
    vendor: "Alpha Nutrition",
    currentQty: 45,
    onOrder: 0,
    sell90Day: 280,
    weeklyRate: 22,
    qtyNeeded: 110,
    qtyApproved: 0,
    daysOfInventory: 14,
    status: "Low Stocks",
    leadTime: "2 weeks",
    reviewPeriod: "1 week",
    leadTimeWeeks: 2,
    reviewPeriodWeeks: 1,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Vitamin C 1000mg",
    variantTitle: "Default Title",
    sku: "ALPHA-003",
    vendor: "Alpha Nutrition",
    currentQty: 12,
    onOrder: 50,
    sell90Day: 190,
    weeklyRate: 15,
    qtyNeeded: 60,
    qtyApproved: 0,
    daysOfInventory: 6,
    status: "Critical",
    leadTime: "2 weeks",
    reviewPeriod: "1 week",
    leadTimeWeeks: 2,
    reviewPeriodWeeks: 1,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Omega-3 Fish Oil",
    variantTitle: "180ct",
    sku: "BCLAB-001",
    vendor: "BioCore Labs",
    currentQty: 320,
    onOrder: 0,
    sell90Day: 150,
    weeklyRate: 12,
    qtyNeeded: 0,
    qtyApproved: 0,
    daysOfInventory: 38,
    status: "Healthy",
    leadTime: "3 weeks",
    reviewPeriod: "2 weeks",
    leadTimeWeeks: 3,
    reviewPeriodWeeks: 2,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Magnesium Glycinate",
    variantTitle: "120ct",
    sku: "BCLAB-002",
    vendor: "BioCore Labs",
    currentQty: 85,
    onOrder: 60,
    sell90Day: 210,
    weeklyRate: 16,
    qtyNeeded: 30,
    qtyApproved: 0,
    daysOfInventory: 22,
    status: "Healthy",
    leadTime: "3 weeks",
    reviewPeriod: "2 weeks",
    leadTimeWeeks: 3,
    reviewPeriodWeeks: 2,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Zinc Plus",
    variantTitle: "90ct",
    sku: "BCLAB-003",
    vendor: "BioCore Labs",
    currentQty: 20,
    onOrder: 0,
    sell90Day: 140,
    weeklyRate: 11,
    qtyNeeded: 90,
    qtyApproved: 0,
    daysOfInventory: 10,
    status: "Critical",
    leadTime: "3 weeks",
    reviewPeriod: "2 weeks",
    leadTimeWeeks: 3,
    reviewPeriodWeeks: 2,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Collagen Peptides",
    variantTitle: "Unflavored",
    sku: "SMTH-001",
    vendor: "Summit Health Co",
    currentQty: 175,
    onOrder: 0,
    sell90Day: 260,
    weeklyRate: 20,
    qtyNeeded: 25,
    qtyApproved: 0,
    daysOfInventory: 30,
    status: "Healthy",
    leadTime: "4 weeks",
    reviewPeriod: "2 weeks",
    leadTimeWeeks: 4,
    reviewPeriodWeeks: 2,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Probiotic Complex",
    variantTitle: "60cap",
    sku: "SMTH-002",
    vendor: "Summit Health Co",
    currentQty: 55,
    onOrder: 80,
    sell90Day: 180,
    weeklyRate: 14,
    qtyNeeded: 40,
    qtyApproved: 0,
    daysOfInventory: 18,
    status: "Low Stocks",
    leadTime: "4 weeks",
    reviewPeriod: "2 weeks",
    leadTimeWeeks: 4,
    reviewPeriodWeeks: 2,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Elderberry Extract",
    variantTitle: "120ml",
    sku: "SMTH-003",
    vendor: "Summit Health Co",
    currentQty: 8,
    onOrder: 0,
    sell90Day: 120,
    weeklyRate: 9,
    qtyNeeded: 80,
    qtyApproved: 0,
    daysOfInventory: 6,
    status: "Critical",
    leadTime: "4 weeks",
    reviewPeriod: "2 weeks",
    leadTimeWeeks: 4,
    reviewPeriodWeeks: 2,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Pre-Workout Energy",
    variantTitle: "Blue Raspberry",
    sku: "PEAK-001",
    vendor: "PeakForm Supplies",
    currentQty: 130,
    onOrder: 50,
    sell90Day: 300,
    weeklyRate: 23,
    qtyNeeded: 80,
    qtyApproved: 0,
    daysOfInventory: 24,
    status: "Healthy",
    leadTime: "2 weeks",
    reviewPeriod: "1 week",
    leadTimeWeeks: 2,
    reviewPeriodWeeks: 1,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "BCAA Recovery",
    variantTitle: "Fruit Punch",
    sku: "PEAK-002",
    vendor: "PeakForm Supplies",
    currentQty: 40,
    onOrder: 0,
    sell90Day: 200,
    weeklyRate: 15,
    qtyNeeded: 70,
    qtyApproved: 0,
    daysOfInventory: 18,
    status: "Low Stocks",
    leadTime: "2 weeks",
    reviewPeriod: "1 week",
    leadTimeWeeks: 2,
    reviewPeriodWeeks: 1,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Creatine Monohydrate",
    variantTitle: "Unflavored",
    sku: "PEAK-003",
    vendor: "PeakForm Supplies",
    currentQty: 95,
    onOrder: 30,
    sell90Day: 160,
    weeklyRate: 12,
    qtyNeeded: 10,
    qtyApproved: 0,
    daysOfInventory: 28,
    status: "Healthy",
    leadTime: "2 weeks",
    reviewPeriod: "1 week",
    leadTimeWeeks: 2,
    reviewPeriodWeeks: 1,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Vitamin D3 5000IU",
    variantTitle: "Softgels",
    sku: "NOVA-001",
    vendor: "NovaPharma Inc",
    currentQty: 410,
    onOrder: 0,
    sell90Day: 380,
    weeklyRate: 29,
    qtyNeeded: 0,
    qtyApproved: 0,
    daysOfInventory: 35,
    status: "Healthy",
    leadTime: "6 weeks",
    reviewPeriod: "3 weeks",
    leadTimeWeeks: 6,
    reviewPeriodWeeks: 3,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "B-Complex Advanced",
    variantTitle: "90cap",
    sku: "NOVA-002",
    vendor: "NovaPharma Inc",
    currentQty: 65,
    onOrder: 0,
    sell90Day: 220,
    weeklyRate: 17,
    qtyNeeded: 50,
    qtyApproved: 0,
    daysOfInventory: 26,
    status: "Healthy",
    leadTime: "6 weeks",
    reviewPeriod: "3 weeks",
    leadTimeWeeks: 6,
    reviewPeriodWeeks: 3,
    uom: 1,
  },
  {
    date: SNAPSHOT_DATE,
    productTitle: "Sleep Support Melatonin",
    variantTitle: "60ct",
    sku: "NOVA-003",
    vendor: "NovaPharma Inc",
    currentQty: 18,
    onOrder: 40,
    sell90Day: 175,
    weeklyRate: 13,
    qtyNeeded: 65,
    qtyApproved: 0,
    daysOfInventory: 10,
    status: "Low Stocks",
    leadTime: "6 weeks",
    reviewPeriod: "3 weeks",
    leadTimeWeeks: 6,
    reviewPeriodWeeks: 3,
    uom: 1,
  },
];

// In-memory approved quantities store (persists across requests in dev)
const approvedQtyStore = new Map<string, number>();

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestedDate = requestUrl.searchParams.get("date")?.trim() ?? "";
  const snapshotDate = requestedDate || SNAPSHOT_DATE;

  const rows = MOCK_ROWS
    .filter((row) => row.date === snapshotDate)
    .map((row) => {
      const storeKey = `${snapshotDate}:${row.sku}`;
      const savedApproved = approvedQtyStore.get(storeKey);
      return {
        ...row,
        qtyApproved: savedApproved ?? row.qtyApproved,
      };
    });

  return NextResponse.json({
    snapshotDate,
    dates: [SNAPSHOT_DATE],
    rows,
  });
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as {
      snapshotDate?: string;
      sku?: string;
      qtyApproved?: number;
    };
    const snapshotDate = payload.snapshotDate?.trim();
    const sku = payload.sku?.trim();
    const qtyApproved = Number(payload.qtyApproved ?? 0);

    if (!snapshotDate || !sku) {
      return NextResponse.json({ success: false, error: "Missing snapshotDate or sku." }, { status: 400 });
    }

    approvedQtyStore.set(`${snapshotDate}:${sku}`, qtyApproved);

    return NextResponse.json({ success: true, snapshotDate, sku, qtyApproved });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
