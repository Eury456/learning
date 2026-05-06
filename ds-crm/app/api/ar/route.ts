import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const addFilters = (q: ReturnType<typeof supabase.from>) => {
    if (status) q = q.eq("status", status);
    if (search)
      q = q.or(
        `client_name.ilike.%${search}%,matter_number.ilike.%${search}%,matter_description.ilike.%${search}%`
      );
    return q;
  };

  // Attempt to join contact — requires schema migration (ar-detail-schema.sql).
  // Falls back to plain select if the FK doesn't exist yet.
  let { data, error } = await addFilters(
    supabase
      .from("ar_items")
      .select("*, contact:contacts(id,name,email,phone)")
      .order("balance_due", { ascending: false })
  );

  if (error) {
    ({ data, error } = await addFilters(
      supabase
        .from("ar_items")
        .select("*")
        .order("balance_due", { ascending: false })
    ));
  }

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const { data, error } = await supabase.from("ar_items").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
