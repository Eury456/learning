"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, Trash2, Search, ArrowUpDown } from "lucide-react";
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
  rezoning:          "Rezoning",
  MIH:               "MIH",
  UAP:               "UAP",
  "485x":            "485-x",
  tax_exemption:     "Tax Exemption",
  transaction:       "Transaction",
  litigation:        "Litigation",
  licensing:         "Licensing",
  affordable_housing:"Affordable Housing",
  other:             "Other",
};

const MATTER_TYPES: MatterType[] = [
  "rezoning","MIH","UAP","485x","tax_exemption","transaction","litigation","licensing","affordable_housing","other"
];

const PIPELINE_COLS: MatterStatus[] = ["prospect", "active", "on_hold", "closed"];

const SORT_OPTIONS = [
  { value: "newest",      label: "Newest First" },
  { value: "oldest",      label: "Oldest First" },
  { value: "client_az",   label: "Client A → Z" },
  { value: "client_za",   label: "Client Z → A" },
  { value: "matter_num",  label: "Matter Number" },
  { value: "fees_high",   label: "Fees High → Low" },
  { value: "fees_low",    label: "Fees Low → High" },
  { value: "opened",      label: "Opened Date" },
];

interface MatterForm {
  matter_number: string;
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
  matter_number: "",
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

function sortMatters(matters: Matter[], sort: string): Matter[] {
  return [...matters].sort((a, b) => {
    switch (sort) {
      case "oldest":    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "client_az": return ((a.client as Contact | undefined)?.name ?? "").localeCompare((b.client as Contact | undefined)?.name ?? "");
      case "client_za": return ((b.client as Contact | undefined)?.name ?? "").localeCompare((a.client as Contact | undefined)?.name ?? "");
      case "matter_num":return (a.matter_number ?? "").localeCompare(b.matter_number ?? "");
      case "fees_high": return (b.estimated_fees ?? 0) - (a.estimated_fees ?? 0);
      case "fees_low":  return (a.estimated_fees ?? 0) - (b.estimated_fees ?? 0);
      case "opened":    return (b.opened_date ?? "").localeCompare(a.opened_date ?? "");
      default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMatter, setEditingMatter] = useState<Matter | null>(null);
  const [form, setForm] = useState<MatterForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q?: string, t?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q?.trim()) params.set("search", q.trim());
    if (t && t !== "all") params.set("type", t);
    const res = await fetch(`/api/matters?${params}`);
    const data = await res.json();
    setMatters(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(v, typeFilter), 300);
  };

  const handleTypeFilter = (t: string) => {
    setTypeFilter(t);
    load(search, t);
  };

  const openAdd = () => {
    setEditingMatter(null);
    setForm(defaultForm);
    setError("");
    setShowDialog(true);
  };

  const openEdit = (matter: Matter) => {
    setEditingMatter(matter);
    setForm({
      matter_number: matter.matter_number ?? "",
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
    if (!form.client_id)    { setError("Client is required — search and select a contact."); return; }
    setSaving(true);
    const body = {
      matter_number:  form.matter_number.trim() || null,
      title:          form.title.trim(),
      client_id:      form.client_id,
      type:           form.type,
      status:         form.status,
      stage:          form.stage.trim() || null,
      description:    form.description.trim() || null,
      estimated_fees: form.estimated_fees ? parseFloat(form.estimated_fees) : null,
      opened_date:    form.opened_date || null,
    };
    const res = editingMatter
      ? await fetch(`/api/matters/${editingMatter.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/matters",                      { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setError(data.error); return; }
    setShowDialog(false);
    load(search, typeFilter);
  };

  const handleDelete = async () => {
    if (!editingMatter) return;
    if (!confirm(`Delete "${editingMatter.title}"? This cannot be undone.`)) return;
    await fetch(`/api/matters/${editingMatter.id}`, { method: "DELETE" });
    setShowDialog(false);
    load(search, typeFilter);
  };

  const displayed = sortMatters(matters, sort);
  const byStatus = (status: MatterStatus) => displayed.filter(m => m.status === status);
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
        {/* Toolbar row 1 */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search matters, clients, matter #..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Sort */}
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-44 text-xs gap-1">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["pipeline", "list"] as const).map(v => (
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

        {/* Type filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-500">Type:</span>
          <button
            onClick={() => handleTypeFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          {MATTER_TYPES.map(t => (
            <button
              key={t}
              onClick={() => handleTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {matterTypeLabel[t]}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading matters...</div>
        )}

        {!loading && matters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-500 font-medium">No matters found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || typeFilter !== "all" ? "Try clearing your filters." : "Click \"New Matter\" to add your first matter."}
            </p>
          </div>
        )}

        {/* Pipeline View */}
        {!loading && view === "pipeline" && matters.length > 0 && (
          <div className="grid grid-cols-4 gap-4 min-h-0">
            {PIPELINE_COLS.map(status => {
              const col = byStatus(status);
              const colTotal = col.reduce((s, m) => s + (m.estimated_fees ?? 0), 0);
              return (
                <div key={status} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[status]}>{STAGES[status]}</Badge>
                      <span className="text-xs text-slate-500">{col.length}</span>
                    </div>
                    {colTotal > 0 && (
                      <span className="text-xs font-medium text-slate-600">{formatCurrency(colTotal)}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {col.map(matter => {
                      const client = matter.client as Contact | undefined;
                      return (
                        <Card key={matter.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(matter)}>
                          <CardContent className="p-3">
                            {matter.matter_number && (
                              <p className="text-[10px] font-mono text-slate-400 mb-0.5">{matter.matter_number}</p>
                            )}
                            <p className="text-sm font-medium text-slate-900 leading-snug">{matter.title}</p>
                            {client?.name && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {client.name}{client.company && ` · ${client.company}`}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] px-1.5">
                                {matterTypeLabel[matter.type] ?? matter.type}
                              </Badge>
                            </div>
                            {matter.stage && (
                              <p className="mt-1.5 text-xs text-slate-500">{matter.stage}</p>
                            )}
                            {(matter.estimated_fees ?? 0) > 0 && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(matter.estimated_fees!)} est.
                              </div>
                            )}
                            {(matter.fees_billed ?? 0) > 0 && (
                              <div className="mt-1">
                                <div className="h-1 w-full rounded-full bg-slate-100">
                                  <div
                                    className="h-1 rounded-full bg-green-500"
                                    style={{ width: `${Math.min(100, ((matter.fees_collected ?? 0) / (matter.fees_billed || 1)) * 100)}%` }}
                                  />
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  {formatCurrency(matter.fees_collected ?? 0)} / {formatCurrency(matter.fees_billed ?? 0)} billed
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {col.length === 0 && (
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Matter #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Matter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Opened</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Est. Fees</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map(matter => {
                    const client = matter.client as Contact | undefined;
                    return (
                      <tr key={matter.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(matter)}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {matter.matter_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{matter.title}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {client?.name ?? "—"}
                          {client?.company && <span className="text-slate-400"> · {client.company}</span>}
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
                        <td className="px-4 py-3 text-slate-500 text-xs">{matter.stage ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {matter.opened_date ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {matter.estimated_fees ? formatCurrency(matter.estimated_fees) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">
                          {matter.fees_collected ? formatCurrency(matter.fees_collected) : "—"}
                        </td>
                      </tr>
                    );
                  })}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="matter_number">Matter Number</Label>
                <Input
                  id="matter_number"
                  value={form.matter_number}
                  onChange={e => setForm(f => ({ ...f, matter_number: e.target.value }))}
                  placeholder="e.g. 16774.0004"
                  className="font-mono"
                />
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
            </div>
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
            ) : <span />}
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
