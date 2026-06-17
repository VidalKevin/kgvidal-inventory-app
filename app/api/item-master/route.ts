import { NextResponse } from "next/server";

type ItemMasterRow = {
  id: string;
  product_title: string;
  product_variant_title: string;
  product_variant_sku: string;
  product_vendor: string;
  uom: string;
};

const mockItems: ItemMasterRow[] = [
  { id: "item-1",  product_title: "Protein Powder",         product_variant_title: "Chocolate",      product_variant_sku: "ALPHA-001", product_vendor: "Alpha Nutrition",   uom: "1" },
  { id: "item-2",  product_title: "Protein Powder",         product_variant_title: "Vanilla",         product_variant_sku: "ALPHA-002", product_vendor: "Alpha Nutrition",   uom: "1" },
  { id: "item-3",  product_title: "Vitamin C 1000mg",       product_variant_title: "Default Title",   product_variant_sku: "ALPHA-003", product_vendor: "Alpha Nutrition",   uom: "1" },
  { id: "item-4",  product_title: "Omega-3 Fish Oil",       product_variant_title: "180ct",           product_variant_sku: "BCLAB-001", product_vendor: "BioCore Labs",      uom: "1" },
  { id: "item-5",  product_title: "Magnesium Glycinate",    product_variant_title: "120ct",           product_variant_sku: "BCLAB-002", product_vendor: "BioCore Labs",      uom: "1" },
  { id: "item-6",  product_title: "Zinc Plus",              product_variant_title: "90ct",            product_variant_sku: "BCLAB-003", product_vendor: "BioCore Labs",      uom: "1" },
  { id: "item-7",  product_title: "Collagen Peptides",      product_variant_title: "Unflavored",      product_variant_sku: "SMTH-001",  product_vendor: "Summit Health Co",  uom: "1" },
  { id: "item-8",  product_title: "Probiotic Complex",      product_variant_title: "60cap",           product_variant_sku: "SMTH-002",  product_vendor: "Summit Health Co",  uom: "1" },
  { id: "item-9",  product_title: "Elderberry Extract",     product_variant_title: "120ml",           product_variant_sku: "SMTH-003",  product_vendor: "Summit Health Co",  uom: "1" },
  { id: "item-10", product_title: "Pre-Workout Energy",     product_variant_title: "Blue Raspberry",  product_variant_sku: "PEAK-001",  product_vendor: "PeakForm Supplies", uom: "1" },
  { id: "item-11", product_title: "BCAA Recovery",          product_variant_title: "Fruit Punch",     product_variant_sku: "PEAK-002",  product_vendor: "PeakForm Supplies", uom: "1" },
  { id: "item-12", product_title: "Creatine Monohydrate",   product_variant_title: "Unflavored",      product_variant_sku: "PEAK-003",  product_vendor: "PeakForm Supplies", uom: "1" },
  { id: "item-13", product_title: "Vitamin D3 5000IU",      product_variant_title: "Softgels",        product_variant_sku: "NOVA-001",  product_vendor: "NovaPharma Inc",    uom: "1" },
  { id: "item-14", product_title: "B-Complex Advanced",     product_variant_title: "90cap",           product_variant_sku: "NOVA-002",  product_vendor: "NovaPharma Inc",    uom: "1" },
  { id: "item-15", product_title: "Sleep Support Melatonin",product_variant_title: "60ct",            product_variant_sku: "NOVA-003",  product_vendor: "NovaPharma Inc",    uom: "1" },
];

const addedItems: ItemMasterRow[] = [];

export async function GET() {
  const all = [...mockItems, ...addedItems].sort((a, b) =>
    a.product_title.localeCompare(b.product_title)
  );
  return NextResponse.json({ items: all });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<ItemMasterRow>;
    const row: ItemMasterRow = {
      id: `item-new-${Date.now()}`,
      product_title: payload.product_title?.trim() ?? "",
      product_variant_title: payload.product_variant_title?.trim() ?? "",
      product_variant_sku: payload.product_variant_sku?.trim() ?? "",
      product_vendor: payload.product_vendor?.trim() ?? "",
      uom: payload.uom?.trim() ?? "1",
    };
    addedItems.push(row);
    return NextResponse.json({ item: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add item." },
      { status: 400 }
    );
  }
}
