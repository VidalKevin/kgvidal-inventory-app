import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MOCK_VENDORS: Record<string, object> = {
  "vendor-alpha": {
    id: "vendor-alpha",
    mfg: "Alpha Nutrition",
    code: "ALPHA",
    lead_time: "2 weeks",
    review_period: "1 week",
    order_at: "Via Email",
    link: "www.alphanutrition-sample.com",
    username: "sample_user",
    password: "XXX",
    contact: "Jane Smith",
    email: "orders@alphanutrition-sample.com",
    phone: "(555) 100-2001",
    settings: null,
  },
  "vendor-biocore": {
    id: "vendor-biocore",
    mfg: "BioCore Labs",
    code: "BIOCORE",
    lead_time: "3 weeks",
    review_period: "2 weeks",
    order_at: "Website",
    link: "www.biocorelabs-sample.com",
    username: "sample_user",
    password: "XXX",
    contact: "Mark Johnson",
    email: "purchasing@biocorelabs-sample.com",
    phone: "(555) 100-2002",
    settings: null,
  },
  "vendor-summit": {
    id: "vendor-summit",
    mfg: "Summit Health Co",
    code: "SMTH",
    lead_time: "4 weeks",
    review_period: "2 weeks",
    order_at: "Via Email",
    link: "www.summithealth-sample.com",
    username: "sample_user",
    password: "XXX",
    contact: "Sarah Lee",
    email: "orders@summithealth-sample.com",
    phone: "(555) 100-2003",
    settings: null,
  },
  "vendor-peak": {
    id: "vendor-peak",
    mfg: "PeakForm Supplies",
    code: "PEAK",
    lead_time: "2 weeks",
    review_period: "1 week",
    order_at: "Via Email",
    link: "www.peakform-sample.com",
    username: "sample_user",
    password: "XXX",
    contact: "Tom Rivera",
    email: "supply@peakform-sample.com",
    phone: "(555) 100-2004",
    settings: null,
  },
  "vendor-nova": {
    id: "vendor-nova",
    mfg: "NovaPharma Inc",
    code: "NOVA",
    lead_time: "6 weeks",
    review_period: "3 weeks",
    order_at: "Website",
    link: "www.novapharma-sample.com",
    username: "sample_user",
    password: "XXX",
    contact: "Lisa Chen",
    email: "orders@novapharma-sample.com",
    phone: "(555) 100-2005",
    settings: null,
  },
};

// In-memory settings store (keyed by vendor id)
const settingsStore = new Map<string, object>();

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const base = MOCK_VENDORS[id];
    if (!base) {
      return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
    }
    const settings = settingsStore.get(id) ?? null;
    return NextResponse.json({ vendor: { ...base, settings } });
  } catch {
    return NextResponse.json({ error: "Unable to fetch vendor." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const base = MOCK_VENDORS[id] ?? {};
    const updated = { ...base, ...body, id };
    if (body.settings !== undefined) {
      settingsStore.set(id, body.settings);
    }
    return NextResponse.json({ vendor: updated });
  } catch {
    return NextResponse.json({ error: "Unable to update vendor." }, { status: 500 });
  }
}
