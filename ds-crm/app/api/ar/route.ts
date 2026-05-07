import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

// Merge matter type from matters table by matter_number (text join, no FK needed).
async function enrichWithMatterType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const nums = rows.map(r => r.matter_number).filter(Boolean);
  if (nums.length === 0) return rows;

  const { data: matters } = await supabase
    .from("matters")
    .select("matter_number, type")
    .in("matter_number", nums);

  const typeMap: Record<string, string> = {};
  for (const m of matters ?? []) {
    if (m.matter_number) typeMap[m.matter_number] = m.type;
  }

  return rows.map(r => ({
    ...r,
    matter_type: r.matter_number ? (typeMap[r.matter_number] ?? null) : null,
  }));
}

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

  const enriched = await enrichWithMatterType(supabase, data ?? []);
  return Response.json(enriched);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const { data, error } = await supabase.from("ar_items").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
