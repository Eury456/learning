import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { searchParams } = request.nextUrl;
  const borough = searchParams.get("borough");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let query = supabase
    .from("projects")
    .select("*, developer:contacts(id,name,company), company:companies(id,name,type)")
    .order("created_at", { ascending: false });

  if (borough && borough !== "all") query = query.eq("borough", borough);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const { data, error } = await supabase
    .from("projects")
    .insert(body)
    .select("*, developer:contacts(id,name,company), company:companies(id,name,type)")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
