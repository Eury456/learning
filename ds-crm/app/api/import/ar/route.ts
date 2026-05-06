import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[$,\s]/g, "")) || 0;
}

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
  const zeroRecords: Record<string, unknown>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, unknown> | null = null;

  const saveCurrentIfValid = () => {
    if (!current || !current.client_name) { current = null; return; }
    if ((current.balance_due as number) > 0) {
      records.push(current);
    } else if (current.matter_number) {
      // Track $0 records so we can mark existing entries as paid
      zeroRecords.push(current);
    }
    current = null;
  };

  for (const row of rows as Record<string, string>[]) {
    const firstKey = Object.keys(row)[0] ?? "";
    const firstVal = (row[firstKey] ?? "").trim();

    if (!firstVal) { saveCurrentIfValid(); continue; }
    if (/^totals?$/i.test(firstVal) || /^grand total/i.test(firstVal)) { saveCurrentIfValid(); continue; }

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

    saveCurrentIfValid();

    const matterMatch = firstVal.match(/^(\d+\.\d+)\s+[A-Za-z]\s+(.+?)\.?\s*$/);
    const matterNumber = matterMatch ? matterMatch[1] : null;
    const clientName = matterMatch
      ? matterMatch[2].replace(/\.$/, "").trim()
      : firstVal.replace(/\.$/, "").trim();

    current = {
      matter_number:    matterNumber,
      client_name:      clientName,
      matter_description: null,
      days_0_27:        parseAmount(findCol(row, "0-27",   "0 - 27",   "027",    "days_0_27",    "current")),
      days_28_60:       parseAmount(findCol(row, "28-60",  "28 - 60",  "2860",   "days_28_60")),
      days_61_90:       parseAmount(findCol(row, "61-90",  "61 - 90",  "6190",   "days_61_90")),
      days_91_120:      parseAmount(findCol(row, "91-120", "91 - 120", "91120",  "days_91_120")),
      days_121_180:     parseAmount(findCol(row, "121-180","121 - 180","121180", "days_121_180")),
      days_181_plus:    parseAmount(findCol(row, "181+",   "181 +",    "181plus","days_181_plus","over180","over 180")),
      balance_due:      parseAmount(findCol(row, "bal due","balance due","baldue","balance_due",  "total",  "bal_due")),
      report_date:      report_date || new Date().toISOString().split("T")[0],
      status:           "open",
    };
  }
  saveCurrentIfValid();

  if (records.length === 0 && zeroRecords.length === 0) {
    return Response.json(
      { error: "No valid AR records found. Make sure your Tabs3 CSV has columns like: 0-27, 28-60, 61-90, 91-120, 121-180, 181+, Bal Due — and that at least one row has a balance > 0." },
      { status: 400 }
    );
  }

  // Collect all matter numbers to look up existing records in one query
  const allMatterNumbers = [
    ...records.map(r => r.matter_number),
    ...zeroRecords.map(r => r.matter_number),
  ].filter((n): n is string => typeof n === "string" && n.length > 0);

  const existingById: Record<string, string> = {};
  if (allMatterNumbers.length > 0) {
    const { data: existingItems } = await supabase
      .from("ar_items")
      .select("id, matter_number")
      .in("matter_number", allMatterNumbers);

    for (const item of existingItems ?? []) {
      if (item.matter_number) existingById[item.matter_number] = item.id;
    }
  }

  let inserted = 0, updated = 0, resolved = 0;
  const now = new Date().toISOString();

  // Upsert positive-balance records
  for (const rec of records) {
    const existingId = rec.matter_number ? existingById[rec.matter_number as string] : null;
    if (existingId) {
      const { error } = await supabase
        .from("ar_items")
        .update({ ...rec, status: "open", updated_at: now })
        .eq("id", existingId);
      if (!error) updated++;
    } else {
      const { error } = await supabase.from("ar_items").insert(rec);
      if (!error) inserted++;
    }
  }

  // Handle $0 records — mark existing as paid and log it
  const reportDateLabel = report_date || new Date().toISOString().split("T")[0];
  for (const rec of zeroRecords) {
    const existingId = existingById[rec.matter_number as string];
    if (!existingId) continue;

    await supabase
      .from("ar_items")
      .update({
        status: "paid",
        balance_due: 0,
        days_0_27: 0, days_28_60: 0, days_61_90: 0,
        days_91_120: 0, days_121_180: 0, days_181_plus: 0,
        updated_at: now,
      })
      .eq("id", existingId);

    await supabase.from("collection_notes").insert({
      ar_item_id:    existingId,
      type:          "payment",
      subject:       `Paid in full — per AR report uploaded ${reportDateLabel}`,
      notes:         `AR report dated ${reportDateLabel} showed $0 balance. All outstanding amounts cleared.`,
      activity_date: now,
    });

    resolved++;
  }

  return Response.json({ imported: inserted, updated, resolved });
}
