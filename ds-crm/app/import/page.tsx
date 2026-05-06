"use client";
import { useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CheckCircle, AlertCircle, FileText, X } from "lucide-react";

type ImportType = "contacts" | "matters" | "invoices";

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  skipped?: number;
  errors?: string[];
}

const CONFIG = {
  contacts: {
    label: "Contacts",
    description: "Import clients, prospects, referral sources, developers, and other relationships. Supports Gmail CSV format automatically.",
    template: "/templates/contacts-template.csv",
    requiredColumns: ["name"],
    columns: ["name","company","title","type","email","phone","linkedin","birthday","notes"],
    typeNote: 'type: client, prospect, referral_source, developer, architect, broker, lender, consultant, government, other',
  },
  matters: {
    label: "Matters",
    description: "Import active matters, prospects, and closed files — contacts must be imported first",
    template: "/templates/matters-template.csv",
    requiredColumns: ["title","client_name"],
    columns: ["title","client_name","type","status","stage","estimated_fees","opened_date","description"],
    typeNote: 'type: rezoning, MIH, UAP, 485x, tax_exemption, transaction, litigation, licensing, affordable_housing, other',
  },
  invoices: {
    label: "Invoices / AR",
    description: "Import outstanding and historical invoices — matters must be imported first",
    template: "/templates/invoices-template.csv",
    requiredColumns: ["matter_title","amount_billed","due_date"],
    columns: ["matter_title","invoice_number","amount_billed","amount_collected","invoice_date","due_date","status","notes"],
    typeNote: 'status: current, 30+, 60+, 90+, paid, written_off',
  },
};

// Detect if this is a Gmail-exported CSV
function isGmailFormat(headers: string[]): boolean {
  return headers.some(h => h.toLowerCase().includes("first name")) &&
    headers.some(h => h.toLowerCase().includes("last name"));
}

// Convert Gmail row to DS-CRM contact format
function convertGmailRow(row: ParsedRow): ParsedRow {
  const firstName = row["first name"]?.trim() ?? "";
  const lastName = row["last name"]?.trim() ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ");

  const labels = (row["labels"] ?? "").toLowerCase();
  let type = "other";
  if (labels.includes("client")) type = "client";
  else if (labels.includes("prospect")) type = "prospect";
  else if (labels.includes("referral")) type = "referral_source";
  else if (labels.includes("developer")) type = "developer";
  else if (labels.includes("broker")) type = "broker";
  else if (labels.includes("lender")) type = "lender";
  else if (labels.includes("architect")) type = "architect";

  // Find primary email
  const email = row["e-mail 1 - value"]?.trim() ||
    row["e-mail 2 - value"]?.trim() ||
    row["e-mail 3 - value"]?.trim() || "";

  // Find primary phone
  const phone = row["phone 1 - value"]?.trim() ||
    row["phone 2 - value"]?.trim() || "";

  // Birthday — Gmail uses --MM-DD or YYYY-MM-DD
  let birthday = row["birthday"]?.trim() || "";
  if (birthday.startsWith("--")) birthday = "";

  const notes = row["organization department"]?.trim() || "";

  return { name, company: row["organization name"]?.trim() ?? "", title: row["organization title"]?.trim() ?? "", type, email, phone, linkedin: "", birthday, notes };
}

function parseCSV(text: string): { rows: ParsedRow[]; isGmail: boolean } {
  if (text.trim().length < 2) return { rows: [], isGmail: false };

  // Split into logical records respecting quoted multi-line fields
  const delimiter = text.split("\n")[0].includes("\t") ? "\t" : ",";
  const records: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === "\n" && !inQuotes) {
      if (current.trim()) records.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) records.push(current);

  if (records.length < 2) return { rows: [], isGmail: false };

  const rawHeaders = records[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map(h => h.toLowerCase());
  const gmail = isGmailFormat(headers);

  const parseValues = (line: string): string[] => {
    const values: string[] = [];
    let val = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === delimiter && !inQ) { values.push(val.trim()); val = ""; }
      else { val += ch; }
    }
    values.push(val.trim());
    return values;
  };

  const rows = records.slice(1).map(line => {
    const values = parseValues(line);
    const raw = headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] ?? "" }), {} as ParsedRow);
    return gmail ? convertGmailRow(raw) : raw;
  }).filter(row => {
    const name = row.name || row["name"] || "";
    // Skip rows where "name" looks like an address fragment
    return name.length > 1 && !name.match(/^\d+\s/) && !name.match(/^new york/i);
  });

  return { rows, isGmail: gmail };
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportType>("contacts");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isGmail, setIsGmail] = useState(false);
  const [status, setStatus] = useState<"idle" | "preview" | "importing" | "done" | "error">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const config = CONFIG[activeTab];

  const handleFile = (file: File) => {
    setFileName(file.name);
    setStatus("idle");
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows: parsed, isGmail: gmail } = parseCSV(e.target?.result as string);
      setRows(parsed);
      setIsGmail(gmail);
      setStatus("preview");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  const handleImport = async () => {
    setStatus("importing");
    const BATCH = 100;
    const totalBatches = Math.ceil(rows.length / BATCH);
    setProgress({ current: 0, total: rows.length });

    const combined: ImportResult = { imported: 0, skipped: 0, errors: [] };

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = rows.slice(i * BATCH, (i + 1) * BATCH);
        const res = await fetch(`/api/import/${activeTab}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        combined.imported += data.imported ?? 0;
        combined.skipped = (combined.skipped ?? 0) + (data.skipped ?? 0);
        combined.errors = [...(combined.errors ?? []), ...(data.errors ?? [])];
        setProgress({ current: Math.min((i + 1) * BATCH, rows.length), total: rows.length });
      }
      setResult(combined);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setResult({ imported: combined.imported, errors: [err instanceof Error ? err.message : "Network error — please try again"] });
    }
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setIsGmail(false);
    setStatus("idle");
    setResult(null);
    setProgress({ current: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const switchTab = (tab: ImportType) => {
    setActiveTab(tab);
    reset();
  };

  const previewColumns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Import Data" subtitle="Upload CSV files to populate your CRM" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-2">
          {(["contacts", "matters", "invoices"] as ImportType[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === t
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {CONFIG[t].label}
            </button>
          ))}
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{config.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
              <p className="text-xs text-slate-400 mt-1">{config.typeNote}</p>
            </div>
            <a
              href={config.template}
              download
              className="flex items-center gap-1.5 shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Template
            </a>
          </CardContent>
        </Card>

        {/* Upload Zone */}
        {status === "idle" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">Drop your CSV here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Supports Gmail CSV and DS-CRM template format</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* Preview */}
        {status === "preview" && rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{fileName}</span>
                <Badge variant="info">{rows.length} contacts</Badge>
                {isGmail && <Badge variant="purple">Gmail format — auto-converted</Badge>}
              </div>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-500">Preview (first 5 rows)</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {previewColumns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap capitalize">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {previewColumns.map((col, j) => (
                          <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[160px] truncate">
                            {row[col] || <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                  + {rows.length - 5} more rows
                </p>
              )}
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleImport} className="flex-1">
                <Upload className="h-4 w-4" />
                Import {rows.length} {config.label}
              </Button>
              <Button variant="outline" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Importing */}
        {status === "importing" && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-slate-900 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">
                Importing {config.label}... {progress.current} / {progress.total}
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900 transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">Do not close this tab</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {status === "done" && result && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-semibold text-slate-900">Import complete</p>
                  <p className="text-sm text-slate-500">
                    {result.imported} {config.label.toLowerCase()} imported
                    {result.skipped ? `, ${result.skipped} skipped` : ""}
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-700">Skipped rows:</p>
                  {result.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-xs text-amber-600">{e}</p>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="text-xs text-amber-500">...and {result.errors.length - 10} more</p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={reset} variant="outline">Import More</Button>
                <Button onClick={() => switchTab(activeTab === "contacts" ? "matters" : activeTab === "matters" ? "invoices" : "contacts")}>
                  Next: {activeTab === "contacts" ? "Import Matters" : activeTab === "matters" ? "Import Invoices" : "Import Contacts"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "error" && result && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <p className="font-semibold text-slate-900">Import failed</p>
              </div>
              {result.errors?.map((e, i) => (
                <p key={i} className="text-sm text-red-600">{e}</p>
              ))}
              <Button onClick={reset} variant="outline" className="mt-4">Try Again</Button>
            </CardContent>
          </Card>
        )}

        {/* Order reminder */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Import order matters:</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <Badge variant="secondary">1</Badge> Contacts first
              <span>→</span>
              <Badge variant="secondary">2</Badge> Matters (needs contacts)
              <span>→</span>
              <Badge variant="secondary">3</Badge> Invoices (needs matters)
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Tip: In Gmail, label contacts as &quot;CLIENTS&quot;, &quot;PROSPECTS&quot;, &quot;DEVELOPERS&quot;, etc. before exporting — the importer will auto-assign the correct type.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
