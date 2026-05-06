import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { rows } = await request.json();

  const validStatuses = ["current","30+","60+","90+","paid","written_off"];
  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    if (!row.matter_title?.trim()) continue;

    const { data: matter } = await supabase
      .from("matters")
      .select("id")
      .ilike("title", `%${row.matter_title.trim()}%`)
      .limit(1)
      .single();

    if (!matter) {
      results.skipped++;
      results.errors.push(`Invoice skipped — matter "${row.matter_title}" not found`);
      continue;
    }

    const { error } = await supabase.from("invoices").insert({
      matter_id: matter.id,
      invoice_number: row.invoice_number?.trim() || null,
      amount_billed: parseFloat(row.amount_billed) || 0,
      amount_collected: parseFloat(row.amount_collected) || 0,
      invoice_date: row.invoice_date?.trim() || new Date().toISOString().split("T")[0],
      due_date: row.due_date?.trim() || new Date().toISOString().split("T")[0],
      status: validStatuses.includes(row.status?.trim()) ? row.status.trim() : "current",
      notes: row.notes?.trim() || null,
    });

    if (error) {
      results.errors.push(`"${row.matter_title}": ${error.message}`);
    } else {
      results.imported++;
    }
  }

  return Response.json(results);
}
