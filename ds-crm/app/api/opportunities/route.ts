import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { searchParams } = request.nextUrl;
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");

  let query = supabase
    .from("opportunities")
    .select(`
      *,
      contact:contacts(id,name,company),
      company:companies(id,name),
      referral_contact:contacts!opportunities_referral_contact_id_fkey(id,name,company)
    `)
    .order("created_at", { ascending: false });

  if (stage && stage !== "all") query = query.eq("stage", stage);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const { data, error } = await supabase
    .from("opportunities")
    .insert(body)
    .select(`
      *,
      contact:contacts(id,name,company),
      company:companies(id,name),
      referral_contact:contacts!opportunities_referral_contact_id_fkey(id,name,company)
    `)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
