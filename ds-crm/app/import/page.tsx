"use client";
import { useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, CheckCircle, AlertCircle, FileText, X } from "lucide-react";

type ImportType = "contacts" | "matters" | "invoices" | "ar" | "ar_detail";

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  skipped?: number;
  errors?: string[];
}

const CONFIG: Record<ImportType, {
  label: string;
  description: string;
  template: string;
  requiredColumns: string[];
  columns: string[];
  typeNote: string;
}> = {
  contacts: {
    label: "Contacts",
    description: "Import clients, prospects, referral sources, developers, and other relationships. Supports Gmail CSV format automatically.",
    template: "/templates/contacts-template.csv",
    requiredColumns: ["name"],
    columns: ["name","company","title","type","email","phone","linkedin","birthday","notes"],
    typeNote: "type: client, prospect, referral_source, developer, architect, broker, lender, consultant, government, other",
  },
  matters: {
    label: "Matters",
    description: "Import active matters, prospects, and closed files — contacts must be imported first",
    template: "/templates/matters-template.csv",
    requiredColumns: ["title","client_name"],
    columns: ["title","client_name","type","status","stage","estimated_fees","opened_date","description"],
    typeNote: "type: rezoning, MIH, UAP, 485x, tax_exemption, transaction, litigation, licensing, affordable_housing, other",
  },
  invoices: {
    label: "Invoices",
    description: "Import outstanding and historical invoices — matters must be imported first",
    template: "/templates/invoices-template.csv",
    requiredColumns: ["matter_title","amount_billed","due_date"],
    columns: ["matter_title","invoice_number","amount_billed","amount_collected","invoice_date","due_date","status","notes"],
    typeNote: "status: current, 30+, 60+, 90+, paid, written_off",
  },
  ar: {
    label: "AR / Tabs3",
    description: "Import AR aging report from Tabs3 — each row is a matter with balances bucketed by age",
    template: "/templates/ar-template.csv",
    requiredColumns: ["client_name","balance_due"],
    columns: ["matter_number","client_name","matter_description","days_0_27","days_28_60","days_61_90","days_91_120","days_121_180","days_181_plus","balance_due","report_date"],
    typeNote: "balance_due must be > 0 to be imported; report_date defaults to today if blank",
  },
  ar_detail: {
    label: "AR Detail",
    description: "Import individual invoice lines from the Tabs3 A/R Detail (Client Ledger) report. Import the AR aging summary first — this matches to those existing records.",
    template: "",
    requiredColumns: [],
    columns: [],
    typeNote: "Columns detected automatically: Date, Fees, Expenses, Advances, Fin Chg, Total (Billed + Due), Ref #, Stmt #",
  },
};

function isGmailFormat(headers: string[]): boolean {
  return headers.some(h => h.toLowerCase().includes("first name")) &&
    headers.some(h => h.toLowerCase().includes("last name"));
}

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

  const email = row["e-mail 1 - value"]?.trim() ||
    row["e-mail 2 - value"]?.trim() ||
    row["e-mail 3 - value"]?.trim() || "";

  const phone = row["phone 1 - value"]?.trim() ||
    row["phone 2 - value"]?.trim() || "";

  let birthday = row["birthday"]?.trim() || "";
  if (birthday.startsWith("--")) birthday = "";

  const notes = row["organization department"]?.trim() || "";

  return { name, company: row["organization name"]?.trim() ?? "", title: row["organization title"]?.trim() ?? "", type, email, phone, linkedin: "", birthday, notes };
}

function parseCSV(text: string, skipNameFilter = false): { rows: ParsedRow[]; isGmail: boolean } {
  if (text.trim().length < 2) return { rows: [], isGmail: false };

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
    if (skipNameFilter) return true;
    const name = row.name || row["name"] || "";
    return name.length > 1 && !name.match(/^\d+\s/) && !name.match(/^new york/i);
  });

  return { rows, isGmail: gmail };
}

const TAB_ORDER: ImportType[] = ["contacts", "matters", "invoices", "ar", "ar_detail"];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportType>("contacts");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [rawText, setRawText] = useState("");
  const [rawPreviewLines, setRawPreviewLines] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [isGmail, setIsGmail] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
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
      const text = e.target?.result as string;
      if (activeTab === "ar_detail") {
        setRawText(text);
        setRawPreviewLines(text.split(/\r?\n/).filter(Boolean).slice(0, 12));
        setStatus("preview");
        return;
      }
      const { rows: parsed, isGmail: gmail } = parseCSV(text, activeTab === "ar");
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

    // AR Detail: send raw text
    if (activeTab === "ar_detail") {
      setProgress({ current: 0, total: 1 });
      try {
        const res = await fetch("/api/import/ar-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult({
          imported: data.invoices_inserted ?? 0,
          errors: data.unmatched_matter_numbers?.length
            ? [`${data.matters_unmatched} matter(s) not found in Collections: ${data.unmatched_matter_numbers.slice(0,5).join(", ")}`]
            : [],
        });
        setStatus("done");
      } catch (err) {
        setStatus("error");
        setResult({ imported: 0, errors: [err instanceof Error ? err.message : "Network error — please try again"] });
      }
      return;
    }

    const BATCH = 100;
    const totalBatches = Math.ceil(rows.length / BATCH);
    setProgress({ current: 0, total: rows.length });

    const combined: ImportResult = { imported: 0, skipped: 0, errors: [] };

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = rows.slice(i * BATCH, (i + 1) * BATCH);
        const body: Record<string, unknown> = { rows: batch };
        if (activeTab === "ar") body.report_date = reportDate;

        const res = await fetch(`/api/import/${activeTab}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
    setRawText("");
    setRawPreviewLines([]);
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

  const nextTab = (): ImportType => {
    const idx = TAB_ORDER.indexOf(activeTab);
    return TAB_ORDER[(idx + 1) % TAB_ORDER.length];
  };

  const previewColumns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Import Data" subtitle="Upload CSV files to populate your CRM" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TAB_ORDER.map((t) => (
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
            {config.template && (
              <a
                href={config.template}
                download
                className="flex items-center gap-1.5 shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Template
              </a>
            )}
          </CardContent>
        </Card>

        {/* AR-specific report date */}
        {activeTab === "ar" && status === "idle" && (
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <Label htmlFor="report-date" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Report Date
              </Label>
              <Input
                id="report-date"
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="w-44"
              />
              <p className="text-xs text-slate-400">Date of the Tabs3 aging report (defaults to today)</p>
            </CardContent>
          </Card>
        )}

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
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === "contacts" ? "Supports Gmail CSV and DS-CRM template format" : "Use the template above as a guide"}
            </p>
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

        {/* AR Detail Preview */}
        {status === "preview" && activeTab === "ar_detail" && rawPreviewLines.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{fileName}</span>
                <Badge variant="info">Ready to import</Badge>
              </div>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-500">File Preview (first 12 lines)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-[10px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 rounded p-3 max-h-48 overflow-y-auto">
                  {rawPreviewLines.join("\n")}
                </pre>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button onClick={handleImport} className="flex-1">
                <Upload className="h-4 w-4" /> Import Invoice Details
              </Button>
              <Button variant="outline" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Empty state — file was read but no rows parsed */}
        {status === "preview" && activeTab !== "ar_detail" && rows.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No rows found in &quot;{fileName}&quot;</p>
              <p className="text-xs text-slate-400">
                {activeTab === "ar"
                  ? "Make sure you are uploading the Tabs3 AR Aging report (not the detail/ledger report). The AR Detail report belongs on the AR Detail tab."
                  : "Check that the file uses the correct columns and matches the template format."}
              </p>
              <Button onClick={reset} variant="outline" size="sm">Try Another File</Button>
            </CardContent>
          </Card>
        )}

        {/* Preview — standard CSV tabs */}
        {status === "preview" && activeTab !== "ar_detail" && rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{fileName}</span>
                <Badge variant="info">{rows.length} {config.label.toLowerCase()}</Badge>
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
                    {activeTab === "ar_detail"
                      ? `${result.imported} invoice line${result.imported !== 1 ? "s" : ""} imported`
                      : `${result.imported} ${config.label.toLowerCase()} imported${result.skipped ? `, ${result.skipped} skipped` : ""}`}
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
                <Button onClick={() => switchTab(nextTab())}>
                  Next: {CONFIG[nextTab()].label}
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
            <p className="text-xs font-semibold text-slate-600 mb-2">Recommended import order:</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <Badge variant="secondary">1</Badge> Contacts
              <span>→</span>
              <Badge variant="secondary">2</Badge> Matters
              <span>→</span>
              <Badge variant="secondary">3</Badge> Invoices
              <span>→</span>
              <Badge variant="secondary">4</Badge> AR / Tabs3
              <span>→</span>
              <Badge variant="secondary">5</Badge> AR Detail
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
