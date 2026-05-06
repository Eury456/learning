import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

function parseAmt(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[$,\s]/g, "")) || 0;
}

// "12/31/2025" → "2025-12-31"
function parseDate(v: string): string | null {
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, dy, yr] = m;
  return `${yr}-${mo.padStart(2, "0")}-${dy.padStart(2, "0")}`;
}

// "16842.0001S  M & H Realty LLC" → "16842.0001"
function normalizeMatterNumber(v: string): string {
  const m = v.trim().match(/^(\d+\.\d+)/);
  return m ? m[1] : v.trim();
}

function parseLine(line: string): string[] {
  const vals: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
    } else if ((ch === "," || ch === "\t") && !inQ) {
      vals.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  vals.push(cur.trim());
  return vals;
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { rawText } = await request.json();

  if (!rawText || typeof rawText !== "string") {
    return Response.json({ error: "rawText required" }, { status: 400 });
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Load all ar_items so we can match by matter_number
  const { data: arItems, error: arErr } = await supabase
    .from("ar_items")
    .select("id, matter_number, client_name");
  if (arErr) return Response.json({ error: arErr.message }, { status: 500 });

  // Build lookup: normalized matter_number → ar_item id
  const matterMap = new Map<string, string>();
  for (const item of arItems ?? []) {
    if (item.matter_number) {
      matterMap.set(normalizeMatterNumber(item.matter_number), item.id);
    }
    // Also index by client_name in case matter_number wasn't parsed separately
    if (item.client_name) {
      const norm = normalizeMatterNumber(item.client_name);
      if (norm !== item.client_name) matterMap.set(norm, item.id);
    }
  }

  type InvoiceInsert = {
    ar_item_id: string;
    invoice_date: string | null;
    fees_billed: number;
    expenses_billed: number;
    advances_billed: number;
    fin_chg_billed: number;
    total_billed: number;
    fees_due: number;
    expenses_due: number;
    advances_due: number;
    fin_chg_due: number;
    total_due: number;
    ref_number: string | null;
    stmt_number: string | null;
  };

  const invoices: InvoiceInsert[] = [];
  const matchedMatterIds = new Set<string>();
  const unmatchedNumbers: string[] = [];

  let currentItemId: string | null = null;
  let currentMatterNum = "";

  for (const line of lines) {
    const vals = parseLine(line);
    const first = vals[0] ?? "";

    // Skip blank first cell
    if (!first) continue;

    // Skip header / report title rows
    if (/^(accounts receivable|client ledger|a\/r|statement|report date|prepared|page)/i.test(first)) continue;
    if (/^(date|billed|due|fees|expenses|advances|fin chg|total|ref|stmt)/i.test(first)) continue;

    // Skip subtotal / balance due rows
    if (/^(subtotal|total|grand total|balance due)/i.test(first)) continue;

    // RE: description row — skip (already captured in aged import)
    if (/^re:/i.test(first)) continue;

    // Matter header: starts with a number like "16842.0001" or "16842.0001S"
    if (/^\d{1,5}\.\d{4}/.test(first)) {
      const norm = normalizeMatterNumber(first);
      if (matterMap.has(norm)) {
        currentItemId = matterMap.get(norm)!;
        matchedMatterIds.add(currentItemId);
        currentMatterNum = norm;
      } else {
        currentItemId = null;
        currentMatterNum = norm;
        if (!unmatchedNumbers.includes(norm)) unmatchedNumbers.push(norm);
      }
      continue;
    }

    // Invoice date row: first cell is a date MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(first) && currentItemId) {
      const d = parseDate(first);
      // Columns: [date, fees_b, exp_b, adv_b, finchg_b, total_b, fees_d, exp_d, adv_d, finchg_d, total_d, ref, stmt]
      invoices.push({
        ar_item_id:      currentItemId,
        invoice_date:    d,
        fees_billed:     parseAmt(vals[1]),
        expenses_billed: parseAmt(vals[2]),
        advances_billed: parseAmt(vals[3]),
        fin_chg_billed:  parseAmt(vals[4]),
        total_billed:    parseAmt(vals[5]),
        fees_due:        parseAmt(vals[6]),
        expenses_due:    parseAmt(vals[7]),
        advances_due:    parseAmt(vals[8]),
        fin_chg_due:     parseAmt(vals[9]),
        total_due:       parseAmt(vals[10]),
        ref_number:      vals[11] || null,
        stmt_number:     vals[12] || null,
      });
      continue;
    }

    // Some Tabs3 exports have the matter on one line without the number pattern
    // but with the client name only — we can't match these reliably, skip
    void currentMatterNum;
  }

  if (invoices.length === 0) {
    return Response.json(
      {
        error:
          "No invoice lines found. Make sure you are uploading the Tabs3 A/R Detail (Client Ledger) report, not the aging summary. " +
          (unmatchedNumbers.length > 0
            ? `Matter numbers not found in Collections: ${unmatchedNumbers.slice(0, 5).join(", ")}`
            : "Import your AR aging summary first via Import → AR / Tabs3."),
      },
      { status: 400 }
    );
  }

  // Delete existing invoices for all matched items (allows clean re-import)
  if (matchedMatterIds.size > 0) {
    await supabase
      .from("ar_invoices")
      .delete()
      .in("ar_item_id", [...matchedMatterIds]);
  }

  // Insert in batches of 500
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < invoices.length; i += BATCH) {
    const batch = invoices.slice(i, i + BATCH);
    const { error } = await supabase.from("ar_invoices").insert(batch);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    inserted += batch.length;
  }

  return Response.json({
    matters_matched: matchedMatterIds.size,
    matters_unmatched: unmatchedNumbers.length,
    invoices_inserted: inserted,
    unmatched_matter_numbers: unmatchedNumbers.slice(0, 20),
  });
}
