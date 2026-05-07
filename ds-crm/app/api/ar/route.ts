import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

// Deduplicate rows by effective matter number, preferring records with a real client name
// over old-format records where client_name held just the matter number.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deduplicateByMatterNumber(rows: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const best: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noNum: any[] = [];

  for (const row of rows) {
    let num: string | null = row.matter_number ?? null;
    if (!num) {
      // Old format: bare matter number stored in client_name
      const m = (row.client_name ?? "").match(/^(\d+\.\d+[A-Za-z\d.]*)\s*$/);
      if (m) num = m[1];
    }

    if (!num) { noNum.push(row); continue; }

    const existing = best[num];
    if (!existing) { best[num] = row; continue; }

    // Prefer record whose client_name is NOT just a bare matter number
    const existingIsNumeric = /^\d+\.\d+/.test(existing.client_name ?? "");
    const rowIsNumeric = /^\d+\.\d+/.test(row.client_name ?? "");

    if (!rowIsNumeric && existingIsNumeric) { best[num] = row; continue; }
    if (rowIsNumeric && !existingIsNumeric) continue;

    // Same quality — keep higher balance
    if (row.balance_due > existing.balance_due) best[num] = row;
  }

  return [...Object.values(best), ...noNum];
}

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
  const deduped = deduplicateByMatterNumber(enriched);
  return Response.json(deduped);
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const body = await request.json();
  const { data, error } = await supabase.from("ar_items").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
