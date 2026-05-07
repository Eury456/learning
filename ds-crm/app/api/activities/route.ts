import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = request.nextUrl;
  const contactId = searchParams.get("contact_id");
  const matterId = searchParams.get("matter_id");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let query = supabase
    .from("activities")
    .select("*, contact:contacts(id,name,company), matter:matters(id,title)")
    .order("activity_date", { ascending: false })
    .limit(limit);

  if (contactId) query = query.eq("contact_id", contactId);
  if (matterId) query = query.eq("matter_id", matterId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("activities")
    .insert(body)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
