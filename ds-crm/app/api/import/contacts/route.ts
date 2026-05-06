import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  const { rows } = await request.json();

  const validTypes = ["client","prospect","referral_source","developer","architect","broker","lender","consultant","government","other"];

  const records = rows.map((row: Record<string, string>) => ({
    name: row.name?.trim(),
    company: row.company?.trim() || null,
    title: row.title?.trim() || null,
    type: validTypes.includes(row.type?.trim()) ? row.type.trim() : "other",
    email: row.email?.trim() || null,
    phone: row.phone?.trim() || null,
    linkedin: row.linkedin?.trim() || null,
    birthday: row.birthday?.trim() || null,
    notes: row.notes?.trim() || null,
  })).filter((r: { name?: string }) => r.name);

  if (records.length === 0) {
    return Response.json({ error: "No valid records found" }, { status: 400 });
  }

  const { data, error } = await supabase.from("contacts").insert(records).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ imported: data.length });
}
