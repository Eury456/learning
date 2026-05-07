import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const contactId = searchParams.get("contact_id");

  let query = supabase
    .from("tasks")
    .select("*, contact:contacts(id,name), matter:matters(id,title)")
    .order("due_date", { ascending: true });

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (contactId) query = query.eq("contact_id", contactId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("tasks")
    .insert(body)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
