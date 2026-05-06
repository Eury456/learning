"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Matter, MatterStatus } from "@/types";

const MOCK_MATTERS: Matter[] = [
  { id: "1", title: "145 W 28th St Rezoning", client_id: "1", type: "rezoning", status: "active", stage: "ULURP Application", description: "C6-2A to C6-4 rezoning for mixed-use tower", estimated_fees: 120000, fees_billed: 85000, fees_collected: 70000, opened_date: "2024-09-01", closed_date: null, created_at: "", updated_at: "" },
  { id: "2", title: "Greenpoint Mixed-Income MIH", client_id: "1", type: "MIH", status: "active", stage: "HPD Submission", description: "Mandatory Inclusionary Housing — Option A, 25% affordable", estimated_fees: 75000, fees_billed: 45000, fees_collected: 45000, opened_date: "2024-11-15", closed_date: null, created_at: "", updated_at: "" },
  { id: "3", title: "485-x Application — 520 Atlantic Ave", client_id: "5", type: "485x", status: "active", stage: "Filing", description: "Affordable New York tax exemption for 150-unit project", estimated_fees: 60000, fees_billed: 30000, fees_collected: 20000, opened_date: "2025-01-10", closed_date: null, created_at: "", updated_at: "" },
  { id: "4", title: "Park Slope Landmark Challenge", client_id: "2", type: "litigation", status: "active", stage: "OATH Hearing", description: "Challenging LPC denial of CoA for façade alteration", estimated_fees: 95000, fees_billed: 60000, fees_collected: 55000, opened_date: "2024-06-20", closed_date: null, created_at: "", updated_at: "" },
  { id: "5", title: "UAP Coordination — Sunset Park Site", client_id: "5", type: "UAP", status: "prospect", stage: null, description: "Potential UAP designation for manufacturing district project", estimated_fees: 45000, fees_billed: 0, fees_collected: 0, opened_date: null, closed_date: null, created_at: "", updated_at: "" },
  { id: "6", title: "421-a Compliance Review", client_id: "3", type: "tax_exemption", status: "closed", stage: null, description: "Post-completion review of 421-a compliance obligations", estimated_fees: 30000, fees_billed: 30000, fees_collected: 30000, opened_date: "2023-03-01", closed_date: "2024-12-15", created_at: "", updated_at: "" },
  { id: "7", title: "Licensing Agreement — 3rd Ave Portfolio", client_id: "2", type: "licensing", status: "active", stage: "Negotiation", description: "Master licensing agreement for ground-floor retail spaces", estimated_fees: 50000, fees_billed: 25000, fees_collected: 25000, opened_date: "2025-02-01", closed_date: null, created_at: "", updated_at: "" },
];

const STAGES: Record<MatterStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  on_hold: "On Hold",
  closed: "Closed",
};

const statusVariant: Record<MatterStatus, "warning" | "success" | "secondary" | "info"> = {
  prospect: "warning",
  active: "success",
  on_hold: "secondary",
  closed: "info",
};

const matterTypeLabel: Record<string, string> = {
  rezoning: "Rezoning",
  MIH: "MIH",
  UAP: "UAP",
  "485x": "485-x",
  tax_exemption: "Tax Exemption",
  transaction: "Transaction",
  litigation: "Litigation",
  licensing: "Licensing",
  affordable_housing: "Affordable Housing",
  other: "Other",
};

const columns: MatterStatus[] = ["prospect", "active", "on_hold", "closed"];

export default function MattersPage() {
  const [view, setView] = useState<"pipeline" | "list">("pipeline");

  const byStatus = (status: MatterStatus) => MOCK_MATTERS.filter((m) => m.status === status);

  const totalPipeline = MOCK_MATTERS.filter((m) => m.status === "active" || m.status === "prospect")
    .reduce((sum, m) => sum + (m.estimated_fees ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Matters" subtitle={`${MOCK_MATTERS.length} matters · ${formatCurrency(totalPipeline)} pipeline`} />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["pipeline", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  view === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Matter
          </Button>
        </div>

        {/* Pipeline View */}
        {view === "pipeline" && (
          <div className="grid grid-cols-4 gap-4 min-h-0">
            {columns.map((status) => {
              const matters = byStatus(status);
              const colTotal = matters.reduce((sum, m) => sum + (m.estimated_fees ?? 0), 0);
              return (
                <div key={status} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[status]}>{STAGES[status]}</Badge>
                      <span className="text-xs text-slate-500">{matters.length}</span>
                    </div>
                    {colTotal > 0 && (
                      <span className="text-xs font-medium text-slate-600">{formatCurrency(colTotal)}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {matters.map((matter) => (
                      <Card key={matter.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <p className="text-sm font-medium text-slate-900 leading-snug">{matter.title}</p>
                          <div className="mt-1 flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              {matterTypeLabel[matter.type]}
                            </Badge>
                          </div>
                          {matter.stage && (
                            <p className="mt-1.5 text-xs text-slate-500">{matter.stage}</p>
                          )}
                          {matter.estimated_fees && matter.estimated_fees > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(matter.estimated_fees)} est.
                            </div>
                          )}
                          {matter.fees_billed !== null && matter.fees_billed > 0 && (
                            <div className="mt-1">
                              <div className="h-1 w-full rounded-full bg-slate-100">
                                <div
                                  className="h-1 rounded-full bg-green-500"
                                  style={{
                                    width: `${Math.min(100, ((matter.fees_collected ?? 0) / (matter.fees_billed || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {formatCurrency(matter.fees_collected ?? 0)} collected / {formatCurrency(matter.fees_billed)} billed
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Matter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Stage</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Est. Fees</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Billed</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MOCK_MATTERS.map((matter) => (
                    <tr key={matter.id} className="hover:bg-slate-50 cursor-pointer">
                      <td className="px-4 py-3 font-medium text-slate-900">{matter.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{matterTypeLabel[matter.type]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[matter.status]} className="text-[10px]">{STAGES[matter.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{matter.stage ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{matter.estimated_fees ? formatCurrency(matter.estimated_fees) : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{matter.fees_billed ? formatCurrency(matter.fees_billed) : "—"}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">{matter.fees_collected ? formatCurrency(matter.fees_collected) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
