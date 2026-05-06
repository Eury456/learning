import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const matterId = searchParams.get("matter_id");

  let query = supabase
    .from("invoices")
    .select("*, matter:matters(id,title,client:contacts(id,name,company))")
    .order("due_date", { ascending: true });

  if (status) query = query.eq("status", status);
  if (matterId) query = query.eq("matter_id", matterId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("invoices")
    .insert(body)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
