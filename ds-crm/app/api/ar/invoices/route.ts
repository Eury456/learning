import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { searchParams } = request.nextUrl;
  const arItemId = searchParams.get("ar_item_id");
  if (!arItemId) return Response.json({ error: "ar_item_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("ar_invoices")
    .select("*")
    .eq("ar_item_id", arItemId)
    .order("invoice_date", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const invoices = Array.isArray(body) ? body : [body];
  const { data, error } = await supabase.from("ar_invoices").insert(invoices).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ inserted: data.length }, { status: 201 });
}
