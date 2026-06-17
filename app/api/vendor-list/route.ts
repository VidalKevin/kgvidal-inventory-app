import { NextRequest, NextResponse } from "next/server";

type VendorRow = {
  id: string;
  mfg: string;
  code: string;
  lead_time: string;
  review_period: string;
  order_at: string;
  link: string;
  username: string;
  password: string;
  contact: string;
  email: string;
  phone: string;
  settings: null;
};

const mockVendors: VendorRow[] = [
  {
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
  {
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
  {
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
  {
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
  {
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
];

// In-memory store for added vendors
const addedVendors: VendorRow[] = [];

export async function GET() {
  const allVendors = [...mockVendors, ...addedVendors].sort((a, b) =>
    a.mfg.localeCompare(b.mfg)
  );
  return NextResponse.json({ vendors: allVendors });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newVendor: VendorRow = {
      id: `vendor-new-${Date.now()}`,
      mfg: body.mfg ?? "",
      code: body.code ?? "",
      lead_time: body.lead_time ?? "",
      review_period: body.review_period ?? "",
      order_at: body.order_at ?? "",
      link: body.link ?? "",
      username: body.username ?? "",
      password: body.password ?? "",
      contact: body.contact ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      settings: null,
    };
    addedVendors.push(newVendor);
    return NextResponse.json({ vendor: newVendor });
  } catch {
    return NextResponse.json({ error: "Unable to add vendor." }, { status: 500 });
  }
}
