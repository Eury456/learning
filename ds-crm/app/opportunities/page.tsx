"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, List, Columns, User, DollarSign, Calendar, X, Settings, GripVertical } from "lucide-react";
import type { Contact } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Company { id: string; name: string; }

interface Opportunity {
  id: string;
  title: string;
  contact_id: string | null;
  contact?: Contact;
  company_id: string | null;
  company?: Company;
  stage: string;
  estimated_value: number | null;
  work_type: string | null;
  origin_source: string | null;
  referral_contact_id: string | null;
  referral_contact?: Contact;
  next_step: string | null;
  next_followup: string | null;
  notes: string | null;
  converted_matter_id: string | null;
  created_at: string;
  updated_at: string;
  // custom fields added at runtime
  custom_fields?: Record<string, string>;
}

interface OppForm {
  title: string;
  contact_id: string;
  contactName: string;
  company_id: string;
  companyName: string;
  stage: string;
  estimated_value: string;
  work_type: string;
  origin_source: string;
  referral_contact_id: string;
  referralName: string;
  next_step: string;
  next_followup: string;
  notes: string;
  custom_fields: Record<string, string>;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STAGES = [
  { value: "lead",           label: "Lead",           color: "bg-gray-100 border-gray-300"   },
  { value: "discussion",     label: "Discussion",     color: "bg-blue-50 border-blue-300"    },
  { value: "consult",        label: "Consult",        color: "bg-purple-50 border-purple-300"},
  { value: "conflict_check", label: "Conflict Check", color: "bg-yellow-50 border-yellow-300"},
  { value: "proposal",       label: "Proposal",       color: "bg-orange-50 border-orange-300"},
  { value: "follow_up",      label: "Follow-Up",      color: "bg-cyan-50 border-cyan-300"    },
  { value: "retained",       label: "Retained",       color: "bg-green-50 border-green-300"  },
  { value: "deferred",       label: "Deferred",       color: "bg-slate-50 border-slate-300"  },
  { value: "lost",           label: "Lost",           color: "bg-red-50 border-red-300"      },
];

const stageBadge: Record<string, "default" | "success" | "warning" | "secondary" | "info" | "destructive"> = {
  lead:           "secondary",
  discussion:     "info",
  consult:        "default",
  conflict_check: "warning",
  proposal:       "warning",
  follow_up:      "info",
  retained:       "success",
  deferred:       "secondary",
  lost:           "destructive",
};

const WORK_TYPES = [
  { value: "rezoning",          label: "Rezoning" },
  { value: "MIH",               label: "MIH" },
  { value: "UAP",               label: "UAP" },
  { value: "485x",              label: "485-x" },
  { value: "tax_exemption",     label: "Tax Exemption" },
  { value: "transaction",       label: "Transaction" },
  { value: "litigation",        label: "Litigation" },
  { value: "licensing",         label: "Licensing" },
  { value: "affordable_housing",label: "Affordable Housing" },
  { value: "other",             label: "Other" },
];

const ORIGIN_SOURCES = [
  { value: "referral",         label: "Referral" },
  { value: "linkedin",         label: "LinkedIn" },
  { value: "podcast",          label: "Podcast" },
  { value: "seminar",          label: "Seminar" },
  { value: "conference",       label: "Conference" },
  { value: "article",          label: "Article" },
  { value: "existing_client",  label: "Existing Client" },
  { value: "cold_outreach",    label: "Cold Outreach" },
  { value: "other",            label: "Other" },
];

const DEFAULT_FIELDS = [
  "title", "contact", "company", "stage", "estimated_value",
  "work_type", "origin_source", "referral_contact", "next_step", "next_followup", "notes",
];

const FIELD_LABELS: Record<string, string> = {
  title:            "Title",
  contact:          "Contact",
  company:          "Company",
  stage:            "Stage",
  estimated_value:  "Estimated Value",
  work_type:        "Work Type",
  origin_source:    "Origin Source",
  referral_contact: "Referral Contact",
  next_step:        "Next Step",
  next_followup:    "Next Follow-Up",
  notes:            "Notes",
};

const BLANK_FORM: OppForm = {
  title: "", contact_id: "", contactName: "", company_id: "", companyName: "",
  stage: "lead", estimated_value: "", work_type: "", origin_source: "",
  referral_contact_id: "", referralName: "", next_step: "", next_followup: "",
  notes: "", custom_fields: {},
};

function fmt$(n: number | null | undefined) {
  if (!n) return "";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

// ── Contact/Company search component ──────────────────────────────────────────

function ContactSearch({
  label, value, onChange, onSelect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: Contact) => void;
}) {
  const [results, setResults] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const container = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) { setResults(await res.json()); setOpen(true); }
    }, 250);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={container}>
      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">{label}</Label>
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); search(e.target.value); }}
        placeholder="Search contacts..."
        className="h-9"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(c); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              <div className="font-medium">{c.name}</div>
              {c.company && <div className="text-xs text-gray-500">{c.company}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanySearch({
  value, onChange, onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: Company) => void;
}) {
  const [results, setResults] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const container = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/companies?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) { setResults(await res.json()); setOpen(true); }
    }, 250);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={container}>
      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Company</Label>
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); search(e.target.value); }}
        placeholder="Search companies..."
        className="h-9"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(c); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 font-medium"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Field Manager ──────────────────────────────────────────────────────────────

function FieldManager({
  visibleFields,
  customFieldKeys,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onClose,
}: {
  visibleFields: string[];
  customFieldKeys: string[];
  onToggle: (f: string) => void;
  onAddCustom: (name: string) => void;
  onRemoveCustom: (key: string) => void;
  onClose: () => void;
}) {
  const [newField, setNewField] = useState("");

  const add = () => {
    const trimmed = newField.trim();
    if (!trimmed) return;
    onAddCustom(trimmed);
    setNewField("");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Toggle which fields appear on opportunity cards and in the form.</p>
      <div className="space-y-2">
        {DEFAULT_FIELDS.filter(f => f !== "title" && f !== "stage").map(f => (
          <label key={f} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleFields.includes(f)}
              onChange={() => onToggle(f)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm">{FIELD_LABELS[f]}</span>
          </label>
        ))}
      </div>
      {customFieldKeys.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Custom Fields</p>
          <div className="space-y-1">
            {customFieldKeys.map(k => (
              <div key={k} className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={visibleFields.includes(`custom_${k}`)}
                    onChange={() => onToggle(`custom_${k}`)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm">{k}</span>
                </label>
                <button
                  onClick={() => onRemoveCustom(k)}
                  className="text-red-400 hover:text-red-600 p-1"
                  title="Remove field"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="border-t pt-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Add Custom Field</p>
        <div className="flex gap-2">
          <Input
            value={newField}
            onChange={e => setNewField(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="Field name..."
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={add}>Add</Button>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState<OppForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Field visibility / custom fields
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_FIELDS);
  const [customFieldKeys, setCustomFieldKeys] = useState<string[]>([]);
  const [fieldMgrOpen, setFieldMgrOpen] = useState(false);

  // Drag-and-drop state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/opportunities?${params}`);
    if (res.ok) setOpps(await res.json());
    setLoading(false);
  }, [stageFilter, search]);

  useEffect(() => { load(); }, [load]);

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(), 300);
  };

  // ── Form helpers ──

  const openAdd = () => {
    setEditing(null);
    setForm(BLANK_FORM);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (o: Opportunity) => {
    setEditing(o);
    setForm({
      title:               o.title,
      contact_id:          o.contact_id ?? "",
      contactName:         o.contact?.name ?? "",
      company_id:          o.company_id ?? "",
      companyName:         o.company?.name ?? "",
      stage:               o.stage,
      estimated_value:     o.estimated_value ? String(o.estimated_value) : "",
      work_type:           o.work_type ?? "",
      origin_source:       o.origin_source ?? "",
      referral_contact_id: o.referral_contact_id ?? "",
      referralName:        o.referral_contact?.name ?? "",
      next_step:           o.next_step ?? "",
      next_followup:       o.next_followup ?? "",
      notes:               o.notes ?? "",
      custom_fields:       o.custom_fields ?? {},
    });
    setError("");
    setDialogOpen(true);
  };

  const set = (k: keyof OppForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const setCustom = (key: string, v: string) =>
    setForm(f => ({ ...f, custom_fields: { ...f.custom_fields, [key]: v } }));

  const save = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = {
      title:               form.title.trim(),
      contact_id:          form.contact_id || null,
      company_id:          form.company_id || null,
      stage:               form.stage,
      estimated_value:     form.estimated_value ? parseFloat(form.estimated_value) : null,
      work_type:           form.work_type || null,
      origin_source:       form.origin_source || null,
      referral_contact_id: form.referral_contact_id || null,
      next_step:           form.next_step || null,
      next_followup:       form.next_followup || null,
      notes:               form.notes || null,
      custom_fields:       Object.keys(form.custom_fields).length ? form.custom_fields : null,
    };

    const url = editing ? `/api/opportunities/${editing.id}` : "/api/opportunities";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Save failed");
      setSaving(false);
      return;
    }
    const saved: Opportunity = await res.json();
    setOpps(prev =>
      editing
        ? prev.map(o => o.id === saved.id ? saved : o)
        : [saved, ...prev]
    );
    setDialogOpen(false);
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this opportunity?")) return;
    await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
    setOpps(prev => prev.filter(o => o.id !== id));
  };

  // ── Drag to change stage ──

  const handleDrop = async (targetStage: string) => {
    if (!dragging || dragging === targetStage) { setDragging(null); setDragOver(null); return; }
    const opp = opps.find(o => o.id === dragging);
    if (!opp) return;
    setOpps(prev => prev.map(o => o.id === dragging ? { ...o, stage: targetStage } : o));
    setDragging(null);
    setDragOver(null);
    await fetch(`/api/opportunities/${dragging}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: targetStage }),
    });
  };

  // ── Field manager helpers ──

  const toggleField = (f: string) =>
    setVisibleFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const addCustomField = (name: string) => {
    const key = name.trim();
    if (!customFieldKeys.includes(key)) {
      setCustomFieldKeys(prev => [...prev, key]);
      setVisibleFields(prev => [...prev, `custom_${key}`]);
    }
  };

  const removeCustomField = (key: string) => {
    setCustomFieldKeys(prev => prev.filter(k => k !== key));
    setVisibleFields(prev => prev.filter(f => f !== `custom_${key}`));
  };

  // ── Render helpers ──

  const stageLabel = (v: string) => STAGES.find(s => s.value === v)?.label ?? v;

  const filtered = opps.filter(o => {
    if (stageFilter !== "all" && o.stage !== stageFilter) return false;
    if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, o) => s + (o.estimated_value ?? 0), 0);
  const retainedValue = filtered.filter(o => o.stage === "retained").reduce((s, o) => s + (o.estimated_value ?? 0), 0);

  // ── Opportunity Card (shared between kanban + list) ──

  const OppCard = ({ o, compact = false }: { o: Opportunity; compact?: boolean }) => (
    <Card
      draggable={view === "kanban"}
      onDragStart={() => setDragging(o.id)}
      onDragEnd={() => { setDragging(null); setDragOver(null); }}
      className={`cursor-pointer hover:shadow-md transition-shadow ${dragging === o.id ? "opacity-40" : ""} ${compact ? "" : "mb-2"}`}
      onClick={() => openEdit(o)}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold leading-tight line-clamp-2">{o.title}</p>
          <button
            onClick={e => { e.stopPropagation(); del(o.id); }}
            className="text-gray-300 hover:text-red-400 shrink-0 mt-0.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {visibleFields.includes("contact") && o.contact && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{o.contact.name}</span>
          </div>
        )}
        {visibleFields.includes("company") && o.company && (
          <div className="text-xs text-gray-500">{o.company.name}</div>
        )}
        {visibleFields.includes("estimated_value") && o.estimated_value && (
          <div className="flex items-center gap-1 text-xs font-medium text-green-700">
            <DollarSign className="w-3 h-3" />
            {fmt$(o.estimated_value)}
          </div>
        )}
        {visibleFields.includes("work_type") && o.work_type && (
          <Badge variant="secondary" className="text-xs">{o.work_type}</Badge>
        )}
        {visibleFields.includes("next_followup") && o.next_followup && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {new Date(o.next_followup).toLocaleDateString()}
          </div>
        )}
        {visibleFields.includes("origin_source") && o.origin_source && (
          <div className="text-xs text-gray-400">
            Source: {ORIGIN_SOURCES.find(s => s.value === o.origin_source)?.label ?? o.origin_source}
          </div>
        )}
        {visibleFields.includes("referral_contact") && o.referral_contact && (
          <div className="text-xs text-gray-400">
            Referred by: {o.referral_contact.name}
          </div>
        )}
        {visibleFields.includes("next_step") && o.next_step && (
          <div className="text-xs text-gray-500 italic line-clamp-1">{o.next_step}</div>
        )}
        {customFieldKeys.map(k =>
          visibleFields.includes(`custom_${k}`) && o.custom_fields?.[k] ? (
            <div key={k} className="text-xs text-gray-500">
              <span className="font-medium">{k}:</span> {o.custom_fields[k]}
            </div>
          ) : null
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-screen">
      <Header title="Opportunities" />

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white flex-wrap">
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New Opportunity
        </Button>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search opportunities..."
            className="h-9 pl-3"
          />
        </div>
        <Select value={stageFilter} onValueChange={v => { setStageFilter(v); }}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-md overflow-hidden h-9">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 h-full flex items-center gap-1.5 text-sm ${view === "kanban" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
          >
            <Columns className="w-4 h-4" /> Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 h-full flex items-center gap-1.5 text-sm border-l ${view === "list" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
          >
            <List className="w-4 h-4" /> List
          </button>
        </div>

        <button
          onClick={() => setFieldMgrOpen(true)}
          className="h-9 px-3 flex items-center gap-1.5 text-sm border rounded-md hover:bg-gray-50"
        >
          <Settings className="w-4 h-4" /> Fields
        </button>

        <div className="ml-auto text-sm text-gray-500 space-x-4">
          <span>{filtered.length} opportunity{filtered.length !== 1 ? "ies" : "y"}</span>
          {totalValue > 0 && <span>Pipeline: <strong>{fmt$(totalValue)}</strong></span>}
          {retainedValue > 0 && <span className="text-green-700">Retained: <strong>{fmt$(retainedValue)}</strong></span>}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
        ) : view === "kanban" ? (
          /* ── Kanban ── */
          <div className="flex gap-3 h-full overflow-x-auto px-6 py-4">
            {STAGES.map(stage => {
              const cards = filtered.filter(o => o.stage === stage.value);
              const colValue = cards.reduce((s, o) => s + (o.estimated_value ?? 0), 0);
              return (
                <div
                  key={stage.value}
                  className={`flex flex-col shrink-0 w-60 rounded-lg border-2 ${stage.color} ${dragOver === stage.value ? "ring-2 ring-blue-400" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(stage.value); }}
                  onDrop={() => handleDrop(stage.value)}
                  onDragLeave={() => setDragOver(null)}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-current/10">
                    <span className="text-xs font-semibold uppercase tracking-wide">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      {colValue > 0 && <span className="text-xs text-gray-500">{fmt$(colValue)}</span>}
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{cards.length}</Badge>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {cards.map(o => <OppCard key={o.id} o={o} />)}
                    {cards.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-6">Drop here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List ── */
          <div className="overflow-auto h-full px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-medium">Title</th>
                  <th className="pb-2 pr-4 font-medium">Stage</th>
                  {visibleFields.includes("contact") && <th className="pb-2 pr-4 font-medium">Contact</th>}
                  {visibleFields.includes("company") && <th className="pb-2 pr-4 font-medium">Company</th>}
                  {visibleFields.includes("estimated_value") && <th className="pb-2 pr-4 font-medium">Value</th>}
                  {visibleFields.includes("work_type") && <th className="pb-2 pr-4 font-medium">Type</th>}
                  {visibleFields.includes("origin_source") && <th className="pb-2 pr-4 font-medium">Source</th>}
                  {visibleFields.includes("next_followup") && <th className="pb-2 pr-4 font-medium">Follow-Up</th>}
                  {customFieldKeys.filter(k => visibleFields.includes(`custom_${k}`)).map(k => (
                    <th key={k} className="pb-2 pr-4 font-medium">{k}</th>
                  ))}
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr
                    key={o.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => openEdit(o)}
                  >
                    <td className="py-2.5 pr-4 font-medium">{o.title}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={stageBadge[o.stage] ?? "secondary"}>{stageLabel(o.stage)}</Badge>
                    </td>
                    {visibleFields.includes("contact") && <td className="py-2.5 pr-4 text-gray-600">{o.contact?.name ?? "—"}</td>}
                    {visibleFields.includes("company") && <td className="py-2.5 pr-4 text-gray-600">{o.company?.name ?? "—"}</td>}
                    {visibleFields.includes("estimated_value") && <td className="py-2.5 pr-4 text-green-700 font-medium">{fmt$(o.estimated_value)}</td>}
                    {visibleFields.includes("work_type") && <td className="py-2.5 pr-4 text-gray-500">{o.work_type ?? "—"}</td>}
                    {visibleFields.includes("origin_source") && <td className="py-2.5 pr-4 text-gray-500">{o.origin_source ? (ORIGIN_SOURCES.find(s => s.value === o.origin_source)?.label ?? o.origin_source) : "—"}</td>}
                    {visibleFields.includes("next_followup") && <td className="py-2.5 pr-4 text-gray-500">{o.next_followup ? new Date(o.next_followup).toLocaleDateString() : "—"}</td>}
                    {customFieldKeys.filter(k => visibleFields.includes(`custom_${k}`)).map(k => (
                      <td key={k} className="py-2.5 pr-4 text-gray-500">{o.custom_fields?.[k] ?? "—"}</td>
                    ))}
                    <td className="py-2.5 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); del(o.id); }}
                        className="text-gray-300 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-gray-400">No opportunities found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Opportunity" : "New Opportunity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Title *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. 123 Main St Rezoning" className="h-9" />
            </div>

            {/* Stage */}
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Stage</Label>
              <Select value={form.stage} onValueChange={v => set("stage", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Contact */}
            {visibleFields.includes("contact") && (
              <ContactSearch
                label="Contact"
                value={form.contactName}
                onChange={v => { setForm(f => ({ ...f, contactName: v, contact_id: "" })); }}
                onSelect={c => setForm(f => ({ ...f, contact_id: c.id, contactName: c.name }))}
              />
            )}

            {/* Company */}
            {visibleFields.includes("company") && (
              <CompanySearch
                value={form.companyName}
                onChange={v => { setForm(f => ({ ...f, companyName: v, company_id: "" })); }}
                onSelect={c => setForm(f => ({ ...f, company_id: c.id, companyName: c.name }))}
              />
            )}

            {/* Estimated Value */}
            {visibleFields.includes("estimated_value") && (
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Estimated Value</Label>
                <Input value={form.estimated_value} onChange={e => set("estimated_value", e.target.value)} placeholder="0.00" type="number" className="h-9" />
              </div>
            )}

            {/* Work Type */}
            {visibleFields.includes("work_type") && (
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Work Type</Label>
                <Select value={form.work_type || "_none"} onValueChange={v => set("work_type", v === "_none" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {WORK_TYPES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Origin Source */}
            {visibleFields.includes("origin_source") && (
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Origin Source</Label>
                <Select value={form.origin_source || "_none"} onValueChange={v => set("origin_source", v === "_none" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {ORIGIN_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Referral Contact */}
            {visibleFields.includes("referral_contact") && form.origin_source === "referral" && (
              <ContactSearch
                label="Referred By"
                value={form.referralName}
                onChange={v => { setForm(f => ({ ...f, referralName: v, referral_contact_id: "" })); }}
                onSelect={c => setForm(f => ({ ...f, referral_contact_id: c.id, referralName: c.name }))}
              />
            )}

            {/* Next Step */}
            {visibleFields.includes("next_step") && (
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Next Step</Label>
                <Input value={form.next_step} onChange={e => set("next_step", e.target.value)} placeholder="e.g. Send engagement letter" className="h-9" />
              </div>
            )}

            {/* Next Follow-Up */}
            {visibleFields.includes("next_followup") && (
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Next Follow-Up</Label>
                <Input value={form.next_followup} onChange={e => set("next_followup", e.target.value)} type="date" className="h-9" />
              </div>
            )}

            {/* Notes */}
            {visibleFields.includes("notes") && (
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Notes</Label>
                <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Additional context..." />
              </div>
            )}

            {/* Custom Fields */}
            {customFieldKeys.map(k => (
              <div key={k}>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">{k}</Label>
                <Input
                  value={form.custom_fields[k] ?? ""}
                  onChange={e => setCustom(k, e.target.value)}
                  className="h-9"
                />
              </div>
            ))}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Field Manager Dialog ── */}
      <Dialog open={fieldMgrOpen} onOpenChange={setFieldMgrOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Manage Fields
            </DialogTitle>
          </DialogHeader>
          <FieldManager
            visibleFields={visibleFields}
            customFieldKeys={customFieldKeys}
            onToggle={toggleField}
            onAddCustom={addCustomField}
            onRemoveCustom={removeCustomField}
            onClose={() => setFieldMgrOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
