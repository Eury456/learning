import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[$,\s]/g, "")) || 0;
}

// Find a column value by trying multiple possible header names (case/punctuation insensitive)
function findCol(row: Record<string, string>, ...candidates: string[]): string {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const norm = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
    const found = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "") === norm);
    if (found !== undefined) return row[found] ?? "";
  }
  return "";
}

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { rows, report_date } = await request.json();

  const records: Record<string, unknown>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, unknown> | null = null;

  const saveCurrentIfValid = () => {
    if (current && (current.balance_due as number) > 0 && current.client_name) {
      records.push(current);
    }
    current = null;
  };

  for (const row of rows as Record<string, string>[]) {
    // First column of the row holds the matter/client line or description
    const firstKey = Object.keys(row)[0] ?? "";
    const firstVal = (row[firstKey] ?? "").trim();

    // Skip completely blank rows
    if (!firstVal) {
      saveCurrentIfValid();
      continue;
    }

    // Skip total / subtotal rows
    if (/^totals?$/i.test(firstVal) || /^grand total/i.test(firstVal)) {
      saveCurrentIfValid();
      continue;
    }

    // Description row — starts with "RE:" or is clearly a continuation line
    // (no numeric amounts in the row, or starts with RE:)
    const isDescriptionRow =
      /^re:/i.test(firstVal) ||
      (firstVal.length > 3 &&
        !firstVal.match(/^\d+\.\d+\s+[A-Z]\s+/) &&
        Object.values(row)
          .slice(1)
          .every(v => !v || v.trim() === "" || v.trim() === "0.00" || v.trim() === "0"));

    if (isDescriptionRow && current) {
      const desc = firstVal.replace(/^re:\s*/i, "").trim();
      if (desc) {
        current.matter_description = current.matter_description
          ? `${current.matter_description} — ${desc}`
          : desc;
      }
      continue;
    }

    // This is a new matter/client row — save previous and start fresh
    saveCurrentIfValid();

    // Parse the first column which contains matter number + client name
    // Formats encountered:
    //   "14526.0015 M Key City Capital LLC."
    //   "16774.0004 S Richmond SI Owners, LLC (Madison Realty Capital)"
    //   "Key City Capital LLC."  (no matter number prefix)
    const matterMatch = firstVal.match(/^(\d+\.\d+)\s+[A-Za-z]\s+(.+?)\.?\s*$/);
    const matterNumber = matterMatch ? matterMatch[1] : null;
    let clientName = matterMatch
      ? matterMatch[2].replace(/\.$/, "").trim()
      : firstVal.replace(/\.$/, "").trim();

    // Strip trailing parenthetical firm name if duplicated, e.g.
    // "Richmond SI Owners, LLC (Madison Realty Capital)" — keep it all, it's useful
    clientName = clientName || firstVal.trim();

    current = {
      matter_number: matterNumber,
      client_name: clientName,
      matter_description: null,
      // Flexible column matching — handles "0-27", "0 - 27", "days_0_27", etc.
      days_0_27:    parseAmount(findCol(row, "0-27",   "0 - 27",   "027",     "days_0_27",    "current")),
      days_28_60:   parseAmount(findCol(row, "28-60",  "28 - 60",  "2860",    "days_28_60")),
      days_61_90:   parseAmount(findCol(row, "61-90",  "61 - 90",  "6190",    "days_61_90")),
      days_91_120:  parseAmount(findCol(row, "91-120", "91 - 120", "91120",   "days_91_120")),
      days_121_180: parseAmount(findCol(row, "121-180","121 - 180","121180",  "days_121_180")),
      days_181_plus: parseAmount(findCol(row, "181+",  "181 +",    "181plus", "days_181_plus", "over180", "over 180")),
      balance_due:  parseAmount(findCol(row, "bal due","balance due","baldue","balance_due",   "total",   "bal_due")),
      report_date:  report_date || new Date().toISOString().split("T")[0],
      status: "open",
    };
  }

  // Don't forget the last record
  saveCurrentIfValid();

  if (records.length === 0) {
    return Response.json(
      {
        error:
          "No valid AR records found. Make sure your Tabs3 CSV has columns like: 0-27, 28-60, 61-90, 91-120, 121-180, 181+, Bal Due — and that at least one row has a balance > 0.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.from("ar_items").insert(records).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ imported: data.length });
}
