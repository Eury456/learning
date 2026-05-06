import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { rows, report_date } = await request.json();

  const records = rows
    .map((row: Record<string, string>) => ({
      matter_number: row.matter_number?.trim() || null,
      client_name: row.client_name?.trim(),
      matter_description: row.matter_description?.trim() || null,
      days_0_27: parseFloat(row.days_0_27) || 0,
      days_28_60: parseFloat(row.days_28_60) || 0,
      days_61_90: parseFloat(row.days_61_90) || 0,
      days_91_120: parseFloat(row.days_91_120) || 0,
      days_121_180: parseFloat(row.days_121_180) || 0,
      days_181_plus: parseFloat(row.days_181_plus) || 0,
      balance_due: parseFloat(row.balance_due) || 0,
      report_date: report_date || new Date().toISOString().split("T")[0],
      status: "open",
    }))
    .filter((r: { client_name?: string; balance_due: number }) => r.client_name && r.balance_due > 0);

  if (records.length === 0) {
    return Response.json({ error: "No valid AR records found" }, { status: 400 });
  }

  const { data, error } = await supabase.from("ar_items").insert(records).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ imported: data.length });
}
