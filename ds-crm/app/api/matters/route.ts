import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const clientId = searchParams.get("client_id");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  let query = supabase
    .from("matters")
    .select("*, client:contacts(id,name,company)")
    .order("created_at", { ascending: false });

  if (status)   query = query.eq("status", status);
  if (clientId) query = query.eq("client_id", clientId);
  if (type)     query = query.eq("type", type);
  if (search)   query = query.or(
    `title.ilike.%${search}%,matter_number.ilike.%${search}%,description.ilike.%${search}%`
  );

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const { data, error } = await supabase
    .from("matters")
    .insert(body)
    .select("*, client:contacts(id,name,company)")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
