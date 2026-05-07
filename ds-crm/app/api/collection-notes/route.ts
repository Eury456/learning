import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { searchParams } = request.nextUrl;
  const arItemId = searchParams.get("ar_item_id");

  let query = supabase
    .from("collection_notes")
    .select("*")
    .order("activity_date", { ascending: false });

  if (arItemId) query = query.eq("ar_item_id", arItemId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const { data, error } = await supabase.from("collection_notes").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
