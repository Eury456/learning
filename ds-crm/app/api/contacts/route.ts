import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  let query = supabase
    .from("contacts")
    .select("*")
    .order("name");

  if (type) query = query.eq("type", type);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("contacts")
    .insert(body)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
