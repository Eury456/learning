"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ContactSearch } from "@/components/ui/contact-search";
import type { Matter, MatterStatus, MatterType, Contact } from "@/types";

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

const MATTER_TYPES: MatterType[] = [
  "rezoning","MIH","UAP","485x","tax_exemption","transaction","litigation","licensing","affordable_housing","other"
];

const PIPELINE_COLS: MatterStatus[] = ["prospect", "active", "on_hold", "closed"];

interface MatterForm {
  title: string;
  client_id: string;
  clientName: string;
  type: MatterType;
  status: MatterStatus;
  stage: string;
  description: string;
  estimated_fees: string;
  opened_date: string;
}

const defaultForm: MatterForm = {
  title: "",
  client_id: "",
  clientName: "",
  type: "rezoning",
  status: "prospect",
  stage: "",
  description: "",
  estimated_fees: "",
  opened_date: "",
};


export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMatter, setEditingMatter] = useState<Matter | null>(null);
  const [form, setForm] = useState<MatterForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/matters");
    const data = await res.json();
    setMatters(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingMatter(null);
    setForm(defaultForm);
    setError("");
    setShowDialog(true);
  };

  const openEdit = (matter: Matter) => {
    setEditingMatter(matter);
    setForm({
      title: matter.title,
      client_id: matter.client_id,
      clientName: (matter.client as Contact | undefined)?.name ?? "",
      type: matter.type,
      status: matter.status,
      stage: matter.stage ?? "",
      description: matter.description ?? "",
      estimated_fees: matter.estimated_fees?.toString() ?? "",
      opened_date: matter.opened_date ?? "",
    });
    setError("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Matter title is required."); return; }
    if (!form.client_id) { setError("Client is required — search and select a contact."); return; }
    setSaving(true);
    const body = {
      title: form.title.trim(),
      client_id: form.client_id,
      type: form.type,
      status: form.status,
      stage: form.stage.trim() || null,
      description: form.description.trim() || null,
      estimated_fees: form.estimated_fees ? parseFloat(form.estimated_fees) : null,
      opened_date: form.opened_date || null,
    };
    const res = editingMatter
      ? await fetch(`/api/matters/${editingMatter.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/matters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setError(data.error); return; }
    setShowDialog(false);
    load();
  };

  const handleDelete = async () => {
    if (!editingMatter) return;
    if (!confirm(`Delete "${editingMatter.title}"? This cannot be undone.`)) return;
    await fetch(`/api/matters/${editingMatter.id}`, { method: "DELETE" });
    setShowDialog(false);
    load();
  };

  const byStatus = (status: MatterStatus) => matters.filter(m => m.status === status);
  const activePipeline = matters
    .filter(m => m.status === "active" || m.status === "prospect")
    .reduce((sum, m) => sum + (m.estimated_fees ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Matters"
        subtitle={loading ? "Loading..." : `${matters.length} matters · ${formatCurrency(activePipeline)} pipeline`}
      />

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
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            New Matter
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Loading matters...
          </div>
        )}

        {!loading && matters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-500 font-medium">No matters yet</p>
            <p className="text-slate-400 text-sm mt-1">Click &quot;New Matter&quot; to add your first matter.</p>
          </div>
        )}

        {/* Pipeline View */}
        {!loading && view === "pipeline" && matters.length > 0 && (
          <div className="grid grid-cols-4 gap-4 min-h-0">
            {PIPELINE_COLS.map((status) => {
              const colMatters = byStatus(status);
              const colTotal = colMatters.reduce((sum, m) => sum + (m.estimated_fees ?? 0), 0);
              return (
                <div key={status} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[status]}>{STAGES[status]}</Badge>
                      <span className="text-xs text-slate-500">{colMatters.length}</span>
                    </div>
                    {colTotal > 0 && (
                      <span className="text-xs font-medium text-slate-600">{formatCurrency(colTotal)}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {colMatters.map((matter) => (
                      <Card
                        key={matter.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openEdit(matter)}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm font-medium text-slate-900 leading-snug">{matter.title}</p>
                          {(matter.client as Contact | undefined)?.name && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {(matter.client as Contact).name}
                              {(matter.client as Contact).company && ` · ${(matter.client as Contact).company}`}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              {matterTypeLabel[matter.type] ?? matter.type}
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
                          {(matter.fees_billed ?? 0) > 0 && (
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
                                {formatCurrency(matter.fees_collected ?? 0)} / {formatCurrency(matter.fees_billed ?? 0)} billed
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {colMatters.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
                        <p className="text-xs text-slate-400">No {STAGES[status].toLowerCase()} matters</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {!loading && view === "list" && matters.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Matter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Stage</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Est. Fees</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {matters.map((matter) => (
                    <tr
                      key={matter.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => openEdit(matter)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{matter.title}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {(matter.client as Contact | undefined)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {matterTypeLabel[matter.type] ?? matter.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[matter.status]} className="text-[10px]">
                          {STAGES[matter.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{matter.stage ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {matter.estimated_fees ? formatCurrency(matter.estimated_fees) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">
                        {matter.fees_collected ? formatCurrency(matter.fees_collected) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMatter ? "Edit Matter" : "New Matter"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="title">Matter Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. 145 W 28th St Rezoning"
              />
            </div>
            <div>
              <Label>Client *</Label>
              <ContactSearch
                value={form.client_id}
                displayName={form.clientName}
                onSelect={(id, name) => setForm(f => ({ ...f, client_id: id, clientName: name }))}
                placeholder="Type to search or create a contact..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as MatterType }))}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATTER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{matterTypeLabel[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as MatterStatus }))}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["prospect","active","on_hold","closed"] as MatterStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{STAGES[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stage">Stage / Phase</Label>
                <Input
                  id="stage"
                  value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                  placeholder="e.g. ULURP Application"
                />
              </div>
              <div>
                <Label htmlFor="estimated_fees">Estimated Fees ($)</Label>
                <Input
                  id="estimated_fees"
                  type="number"
                  value={form.estimated_fees}
                  onChange={e => setForm(f => ({ ...f, estimated_fees: e.target.value }))}
                  placeholder="e.g. 75000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="opened_date">Opened Date</Label>
              <Input
                id="opened_date"
                type="date"
                value={form.opened_date}
                onChange={e => setForm(f => ({ ...f, opened_date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Project overview, key issues, strategy notes..."
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter className="flex items-center justify-between">
            {editingMatter ? (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingMatter ? "Save Changes" : "Create Matter"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
