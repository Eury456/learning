import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { rows } = await request.json();

  const validTypes = ["rezoning","MIH","UAP","485x","tax_exemption","transaction","litigation","licensing","affordable_housing","other"];
  const validStatuses = ["prospect","active","on_hold","closed"];

  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    if (!row.title?.trim()) continue;

    let clientId: string | null = null;

    if (row.client_name?.trim()) {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .ilike("name", `%${row.client_name.trim()}%`)
        .limit(1)
        .single();
      clientId = data?.id ?? null;
    }

    if (!clientId) {
      results.skipped++;
      results.errors.push(`"${row.title}" skipped — client "${row.client_name}" not found`);
      continue;
    }

    const { error } = await supabase.from("matters").insert({
      title: row.title.trim(),
      client_id: clientId,
      type: validTypes.includes(row.type?.trim()) ? row.type.trim() : "other",
      status: validStatuses.includes(row.status?.trim()) ? row.status.trim() : "active",
      stage: row.stage?.trim() || null,
      estimated_fees: row.estimated_fees ? parseFloat(row.estimated_fees) : null,
      opened_date: row.opened_date?.trim() || null,
      description: row.description?.trim() || null,
    });

    if (error) {
      results.errors.push(`"${row.title}": ${error.message}`);
    } else {
      results.imported++;
    }
  }

  return Response.json(results);
}
