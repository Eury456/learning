import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

const validTypes = ["rezoning","MIH","UAP","485x","tax_exemption","transaction","litigation","licensing","affordable_housing","other"];
const validStatuses = ["prospect","active","on_hold","closed"];

// Strip trailing punctuation and parenthetical firm names from Tabs3-style client names.
// "Richmond SI Owners, LLC (Madison Realty Capital)." → "Richmond SI Owners, LLC"
function cleanClientName(raw: string): string {
  return raw
    .replace(/\s*\([^)]+\)\s*$/, "")  // remove trailing "(Firm Name)"
    .replace(/[.,]+\s*$/, "")          // remove trailing . or ,
    .trim();
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { rows } = await request.json();

  const results = { imported: 0, skipped: 0, errors: [] as string[], contacts_created: 0 };

  for (const row of rows) {
    if (!row.title?.trim()) continue;

    const rawName = row.client_name?.trim() ?? "";
    const cleanName = cleanClientName(rawName);

    if (!cleanName) {
      results.skipped++;
      results.errors.push(`"${row.title}" skipped — no client name`);
      continue;
    }

    let clientId: string | null = null;

    // Pass 1: contact name contains the cleaned client name (handles trailing punctuation)
    const { data: m1 } = await supabase
      .from("contacts")
      .select("id")
      .ilike("name", `%${cleanName}%`)
      .limit(1)
      .single();
    clientId = m1?.id ?? null;

    // Pass 2: match on first 3 significant words (handles names truncated differently)
    if (!clientId) {
      const shortName = cleanName.split(/\s+/).slice(0, 3).join(" ");
      if (shortName.length >= 5) {
        const { data: m2 } = await supabase
          .from("contacts")
          .select("id")
          .ilike("name", `%${shortName}%`)
          .limit(1)
          .single();
        clientId = m2?.id ?? null;
      }
    }

    // Pass 3: auto-create the contact so the matter is never dropped
    if (!clientId) {
      const { data: created, error: createErr } = await supabase
        .from("contacts")
        .insert({ name: cleanName, type: "client" })
        .select("id")
        .single();
      if (!createErr && created?.id) {
        clientId = created.id;
        results.contacts_created++;
      }
    }

    if (!clientId) {
      results.skipped++;
      results.errors.push(`"${row.title}" skipped — could not find or create client "${cleanName}"`);
      continue;
    }

    const { error } = await supabase.from("matters").insert({
      title:          row.title.trim(),
      client_id:      clientId,
      type:           validTypes.includes(row.type?.trim()) ? row.type.trim() : "other",
      status:         validStatuses.includes(row.status?.trim()) ? row.status.trim() : "active",
      stage:          row.stage?.trim() || null,
      estimated_fees: row.estimated_fees ? parseFloat(row.estimated_fees) : null,
      opened_date:    row.opened_date?.trim() || null,
      description:    row.description?.trim() || null,
    });

    if (error) {
      results.errors.push(`"${row.title}": ${error.message}`);
    } else {
      results.imported++;
    }
  }

  return Response.json(results);
}
