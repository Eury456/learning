"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertTriangle, DollarSign, Phone, Mail, MessageSquare,
  FileText, Plus, ChevronRight, Loader2, Calendar, Link,
  CheckCircle, Clock, TrendingDown, Search, ArrowUpDown,
  Edit2, Save, X, User, Receipt, BookOpen,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Contact } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ARItem {
  id: string;
  matter_number: string | null;
  client_name: string;
  matter_description: string | null;
  days_0_27: number;
  days_28_60: number;
  days_61_90: number;
  days_91_120: number;
  days_121_180: number;
  days_181_plus: number;
  balance_due: number;
  report_date: string;
  status: string;
  promise_date: string | null;
  promise_amount: number | null;
  next_followup: string | null;
  contact_id: string | null;
  contact?: Contact;
  ar_contact_name: string | null;
  ar_contact_email: string | null;
  ar_contact_phone: string | null;
}

interface CollectionNote {
  id: string;
  ar_item_id: string;
  type: string;
  subject: string;
  notes: string | null;
  contact_name: string | null;
  amount: number | null;
  follow_up_date: string | null;
  document_url: string | null;
  activity_date: string;
}

interface ARInvoice {
  id: string;
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
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "amount_desc",  label: "Largest Amount" },
  { value: "amount_asc",   label: "Smallest Amount" },
  { value: "oldest",       label: "Oldest Outstanding" },
  { value: "newest",       label: "Most Recent" },
  { value: "client_az",    label: "Client A → Z" },
  { value: "client_za",    label: "Client Z → A" },
  { value: "followup",     label: "Next Follow-Up" },
  { value: "balance_pct",  label: "Highest 181+ %" },
];

const noteTypeIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: MessageSquare,
  note: FileText, promise: CheckCircle, payment: DollarSign, document: Link,
};

const noteTypeColors: Record<string, string> = {
  call:     "bg-green-100 text-green-700",
  email:    "bg-blue-100 text-blue-700",
  meeting:  "bg-purple-100 text-purple-700",
  note:     "bg-slate-100 text-slate-700",
  promise:  "bg-amber-100 text-amber-700",
  payment:  "bg-emerald-100 text-emerald-700",
  document: "bg-indigo-100 text-indigo-700",
};

const statusVariant: Record<string, "success" | "warning" | "info" | "destructive" | "secondary"> = {
  open: "warning", promised: "info", partial: "info",
  disputed: "destructive", paid: "success", written_off: "secondary",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function agingBucket(item: ARItem): string {
  if (item.days_181_plus > 0) return "181+";
  if (item.days_121_180 > 0) return "121-180";
  if (item.days_91_120 > 0) return "91-120";
  if (item.days_61_90 > 0) return "61-90";
  if (item.days_28_60 > 0) return "28-60";
  return "0-27";
}

function agingScore(item: ARItem): number {
  if (item.days_181_plus > 0) return 100;
  if (item.days_121_180 > 0) return 80;
  if (item.days_91_120 > 0)  return 60;
  if (item.days_61_90 > 0)   return 40;
  if (item.days_28_60 > 0)   return 20;
  return 0;
}

function priorityLevel(item: ARItem): "critical" | "high" | "medium" | "low" {
  if (item.days_181_plus > 0 || item.days_121_180 > 0) return "critical";
  if (item.days_91_120 > 0) return "high";
  if (item.days_61_90 > 0 || item.days_28_60 > 0) return "medium";
  return "low";
}

const priorityBorder: Record<string, string> = {
  critical: "border-l-4 border-l-red-500",
  high:     "border-l-4 border-l-orange-400",
  medium:   "border-l-4 border-l-amber-400",
  low:      "border-l-4 border-l-slate-200",
};

const bucketColor: Record<string, string> = {
  "181+":    "bg-red-100 text-red-700",
  "121-180": "bg-red-100 text-red-700",
  "91-120":  "bg-orange-100 text-orange-700",
  "61-90":   "bg-amber-100 text-amber-700",
  "28-60":   "bg-yellow-100 text-yellow-700",
  "0-27":    "bg-slate-100 text-slate-600",
};

function applySort(items: ARItem[], sort: string): ARItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "amount_desc":  return b.balance_due - a.balance_due;
      case "amount_asc":   return a.balance_due - b.balance_due;
      case "oldest":       return agingScore(b) - agingScore(a) || b.balance_due - a.balance_due;
      case "newest":       return agingScore(a) - agingScore(b) || b.balance_due - a.balance_due;
      case "client_az":    return a.client_name.localeCompare(b.client_name);
      case "client_za":    return b.client_name.localeCompare(a.client_name);
      case "followup": {
        const fa = a.next_followup ? new Date(a.next_followup).getTime() : Infinity;
        const fb = b.next_followup ? new Date(b.next_followup).getTime() : Infinity;
        return fa - fb;
      }
      case "balance_pct": {
        const pa = a.balance_due ? a.days_181_plus / a.balance_due : 0;
        const pb = b.balance_due ? b.days_181_plus / b.balance_due : 0;
        return pb - pa;
      }
      default: return b.balance_due - a.balance_due;
    }
  });
}

// ── Contact search (for linking AR contact) ────────────────────────────────────

function ContactSearch({
  value, onChange, onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: Contact) => void;
}) {
  const [results, setResults] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const container = useRef<HTMLDivElement>(null);

  const search = (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) { setResults(await res.json()); setOpen(true); }
    }, 250);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={container}>
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); search(e.target.value); }}
        placeholder="Search contacts in system..."
        className="h-8 text-sm"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-40 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(c); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
            >
              <span className="font-medium">{c.name}</span>
              {c.company && <span className="text-gray-400 ml-2">{c.company}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [items, setItems] = useState<ARItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ARItem | null>(null);
  const [notes, setNotes] = useState<CollectionNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [invoices, setInvoices] = useState<ARInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("amount_desc");
  const [detailTab, setDetailTab] = useState<"overview" | "invoices" | "contact">("overview");

  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Contact edit state
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    ar_contact_name: "",
    ar_contact_email: "",
    ar_contact_phone: "",
    contact_id: "",
    contactSearchVal: "",
  });

  const [noteForm, setNoteForm] = useState({
    type: "call", subject: "", notes: "", contact_name: "",
    amount: "", follow_up_date: "", document_url: "",
  });
  const [statusForm, setStatusForm] = useState({
    status: "", promise_date: "", promise_amount: "", next_followup: "",
  });

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = useCallback(async (searchVal?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const s = searchVal ?? search;
      if (s) params.set("search", s);
      const res = await fetch(`/api/ar?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchItems(v), 350);
  };

  const fetchNotes = useCallback(async (itemId: string) => {
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/collection-notes?ar_item_id=${itemId}`);
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async (itemId: string) => {
    setInvoicesLoading(true);
    try {
      const res = await fetch(`/api/ar/invoices?ar_item_id=${itemId}`);
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  const selectItem = (item: ARItem) => {
    setSelected(item);
    setDetailTab("overview");
    fetchNotes(item.id);
    fetchInvoices(item.id);
    setStatusForm({
      status:         item.status,
      promise_date:   item.promise_date ?? "",
      promise_amount: item.promise_amount?.toString() ?? "",
      next_followup:  item.next_followup ?? "",
    });
    setContactForm({
      ar_contact_name:  item.ar_contact_name ?? "",
      ar_contact_email: item.ar_contact_email ?? "",
      ar_contact_phone: item.ar_contact_phone ?? "",
      contact_id:       item.contact_id ?? "",
      contactSearchVal: item.contact?.name ?? "",
    });
    setEditingContact(false);
  };

  const addNote = async () => {
    if (!selected || !noteForm.subject.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/collection-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ar_item_id:    selected.id,
          type:          noteForm.type,
          subject:       noteForm.subject,
          notes:         noteForm.notes || null,
          contact_name:  noteForm.contact_name || null,
          amount:        noteForm.amount ? parseFloat(noteForm.amount) : null,
          follow_up_date: noteForm.follow_up_date || null,
          document_url:  noteForm.document_url || null,
          activity_date: new Date().toISOString(),
        }),
      });
      setShowNoteDialog(false);
      setNoteForm({ type: "call", subject: "", notes: "", contact_name: "", amount: "", follow_up_date: "", document_url: "" });
      fetchNotes(selected.id);
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ar/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:         statusForm.status,
          promise_date:   statusForm.promise_date || null,
          promise_amount: statusForm.promise_amount ? parseFloat(statusForm.promise_amount) : null,
          next_followup:  statusForm.next_followup || null,
        }),
      });
      const updated = await res.json();
      setShowStatusDialog(false);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setSelected(updated);
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ar/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ar_contact_name:  contactForm.ar_contact_name || null,
          ar_contact_email: contactForm.ar_contact_email || null,
          ar_contact_phone: contactForm.ar_contact_phone || null,
          contact_id:       contactForm.contact_id || null,
        }),
      });
      const updated = await res.json();
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setSelected(updated);
      setEditingContact(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    await fetch(`/api/collection-notes/${noteId}`, { method: "DELETE" });
    if (selected) fetchNotes(selected.id);
  };

  // Summary stats
  const pastDue = items.filter(i => i.days_28_60 > 0 || i.days_61_90 > 0 || i.days_91_120 > 0 || i.days_121_180 > 0 || i.days_181_plus > 0);
  const totalPastDue = pastDue.reduce((s, i) => s + i.balance_due, 0);
  const critical = items.filter(i => priorityLevel(i) === "critical");
  const totalCritical = critical.reduce((s, i) => s + i.balance_due, 0);
  const needsFollowup = items.filter(i => i.next_followup && new Date(i.next_followup) <= new Date() && i.status !== "paid");

  const filtered = statusFilter === "all" ? items : items.filter(i => i.status === statusFilter);
  const sortedItems = applySort(filtered, sort);

  // Invoice totals
  const invTotalBilled = invoices.reduce((s, inv) => s + inv.total_billed, 0);
  const invTotalDue = invoices.reduce((s, inv) => s + inv.total_due, 0);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Collections" subtitle="AR tracking and collection management" />

      <div className="flex-1 p-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Past Due AR</p>
                  <p className="text-xl font-bold text-amber-700">{formatCurrency(totalPastDue)}</p>
                  <p className="text-xs text-slate-400">{pastDue.length} matters</p>
                </div>
                <div className="rounded-lg p-2 bg-amber-50"><DollarSign className="h-5 w-5 text-amber-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">90+ Days (Critical)</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(totalCritical)}</p>
                  <p className="text-xs text-slate-400">{critical.length} matters</p>
                </div>
                <div className="rounded-lg p-2 bg-red-50"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Follow-ups Due</p>
                  <p className="text-xl font-bold text-purple-700">{needsFollowup.length}</p>
                  <p className="text-xs text-slate-400">overdue reminders</p>
                </div>
                <div className="rounded-lg p-2 bg-purple-50"><Clock className="h-5 w-5 text-purple-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total AR Items</p>
                  <p className="text-xl font-bold text-slate-900">{items.length}</p>
                  <p className="text-xs text-slate-400">open matters</p>
                </div>
                <div className="rounded-lg p-2 bg-slate-50"><TrendingDown className="h-5 w-5 text-slate-600" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          {/* ── AR List ── */}
          <div className="lg:col-span-2 space-y-2">
            {/* Search + Sort */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search client, matter, description…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status pills */}
            <div className="flex gap-1 flex-wrap">
              {["all","open","promised","disputed","paid"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {s}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : sortedItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-sm text-slate-500">No AR items found</p>
                  <p className="text-xs text-slate-400 mt-1">Import your Tabs3 AR report to get started</p>
                  <Button size="sm" className="mt-3" onClick={() => window.location.href = "/import"}>Go to Import</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5 max-h-[62vh] overflow-y-auto pr-1">
                {sortedItems.map(item => {
                  const priority = priorityLevel(item);
                  const bucket = agingBucket(item);
                  const isSelected = selected?.id === item.id;
                  return (
                    <Card key={item.id}
                      className={`cursor-pointer transition-all ${priorityBorder[priority]} ${isSelected ? "ring-2 ring-slate-900 bg-slate-50" : "hover:shadow-md"}`}
                      onClick={() => selectItem(item)}>
                      <CardContent className="p-3">
                        {/* Matter number — small and secondary */}
                        {item.matter_number && (
                          <p className="text-[10px] text-slate-400 font-mono mb-0.5">{item.matter_number}</p>
                        )}
                        {/* Client name — primary, large */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 leading-tight">{item.client_name}</p>
                          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                        </div>
                        {/* Matter description / property address */}
                        {item.matter_description && (
                          <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-2">{item.matter_description}</p>
                        )}
                        {/* Status + aging + amount */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={statusVariant[item.status] ?? "secondary"} className="text-[10px] capitalize">{item.status}</Badge>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${bucketColor[bucket] ?? "bg-slate-100 text-slate-600"}`}>
                              {bucket} days
                            </span>
                            {item.ar_contact_name && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <User className="h-2.5 w-2.5" />{item.ar_contact_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(item.balance_due)}</p>
                        </div>
                        {item.next_followup && (
                          <p className={`mt-1 text-[10px] flex items-center gap-1 ${new Date(item.next_followup) <= new Date() ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                            <Calendar className="h-3 w-3" />
                            Follow up: {formatDate(item.next_followup)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Detail Panel ── */}
          <div className="lg:col-span-3">
            {!selected ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-20">
                  <p className="text-sm text-slate-400">Select a matter to view collection details</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Matter Header Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {selected.matter_number && (
                          <p className="text-xs text-slate-400 font-mono mb-0.5">{selected.matter_number}</p>
                        )}
                        <p className="text-xl font-bold text-slate-900 leading-tight">{selected.client_name}</p>
                        {selected.matter_description && (
                          <p className="text-sm text-slate-600 italic mt-0.5">{selected.matter_description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setShowStatusDialog(true)}>Update Status</Button>
                        <Button size="sm" onClick={() => setShowNoteDialog(true)}>
                          <Plus className="h-3.5 w-3.5" /> Log
                        </Button>
                      </div>
                    </div>

                    {/* Aging breakdown */}
                    <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                      {[
                        { label: "0-27",    val: selected.days_0_27,    color: "bg-slate-100" },
                        { label: "28-60",   val: selected.days_28_60,   color: "bg-amber-50" },
                        { label: "61-90",   val: selected.days_61_90,   color: "bg-amber-100" },
                        { label: "91-120",  val: selected.days_91_120,  color: "bg-orange-100" },
                        { label: "121-180", val: selected.days_121_180, color: "bg-red-100" },
                        { label: "181+",    val: selected.days_181_plus,color: "bg-red-200" },
                        { label: "Total",   val: selected.balance_due,  color: "bg-slate-900" },
                      ].map(({ label, val, color }) => (
                        <div key={label} className={`rounded p-1.5 ${color}`}>
                          <p className={`text-[9px] font-medium ${color === "bg-slate-900" ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
                          <p className={`text-xs font-bold ${color === "bg-slate-900" ? "text-white" : val > 0 ? "text-slate-900" : "text-slate-300"}`}>
                            {val > 0 ? formatCurrency(val) : "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Status row */}
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <Badge variant={statusVariant[selected.status]} className="capitalize">{selected.status}</Badge>
                      {selected.promise_date && (
                        <span className="text-xs text-slate-500">
                          Promise: {formatCurrency(selected.promise_amount ?? 0)} by {formatDate(selected.promise_date)}
                        </span>
                      )}
                      {selected.next_followup && (
                        <span className={`text-xs flex items-center gap-1 ${new Date(selected.next_followup) <= new Date() ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                          <Calendar className="h-3 w-3" />
                          Follow up: {formatDate(selected.next_followup)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs: Overview | Invoices | Contact */}
                <div className="flex gap-1 border-b">
                  {[
                    { id: "overview" as const, label: "Activity Log",   icon: BookOpen },
                    { id: "invoices" as const, label: `Invoices${invoices.length > 0 ? ` (${invoices.length})` : ""}`, icon: Receipt },
                    { id: "contact"  as const, label: "Collections Contact", icon: User },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                        detailTab === tab.id
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── Activity Log Tab ── */}
                {detailTab === "overview" && (
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm">Collection Log</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-80 overflow-y-auto px-4 pb-4">
                      {notesLoading ? (
                        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                      ) : notes.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">No activity logged yet — log your first contact</p>
                      ) : (
                        notes.map(note => {
                          const Icon = noteTypeIcons[note.type] ?? FileText;
                          return (
                            <div key={note.id} className="flex gap-3 group">
                              <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs ${noteTypeColors[note.type] ?? "bg-slate-100 text-slate-600"}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-900">{note.subject}</p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-slate-400">{formatDate(note.activity_date)}</span>
                                    <button onClick={() => deleteNote(note.id)} className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs">✕</button>
                                  </div>
                                </div>
                                {note.contact_name && <p className="text-xs text-slate-500">{note.contact_name}</p>}
                                {note.notes && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{note.notes}</p>}
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  {note.amount && <span className="text-xs font-semibold text-green-700">{formatCurrency(note.amount)}</span>}
                                  {note.follow_up_date && (
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" /> Follow up: {formatDate(note.follow_up_date)}
                                    </span>
                                  )}
                                  {note.document_url && (
                                    <a href={note.document_url} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                      <Link className="h-3 w-3" /> Document
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* ── Invoices Tab ── */}
                {detailTab === "invoices" && (
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Individual Invoices</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => window.location.href = "/import"}>
                          Import Detail Report
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {invoicesLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                      ) : invoices.length === 0 ? (
                        <div className="text-center py-8">
                          <Receipt className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No invoice detail imported yet</p>
                          <p className="text-xs text-slate-400 mt-1">Upload the Tabs3 A/R Detail report via <strong>Import Data → AR Detail</strong></p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.href = "/import"}>
                            Go to Import
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-left text-slate-500 uppercase tracking-wide">
                                <th className="pb-2 pr-3 font-medium">Date</th>
                                <th className="pb-2 pr-3 font-medium text-right">Fees</th>
                                <th className="pb-2 pr-3 font-medium text-right">Exp</th>
                                <th className="pb-2 pr-3 font-medium text-right">Total Billed</th>
                                <th className="pb-2 pr-3 font-medium text-right">Total Due</th>
                                <th className="pb-2 pr-3 font-medium">Ref #</th>
                                <th className="pb-2 font-medium">Stmt #</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50">
                                  <td className="py-1.5 pr-3 text-slate-600">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "—"}</td>
                                  <td className="py-1.5 pr-3 text-right text-slate-700">{inv.fees_billed > 0 ? formatCurrency(inv.fees_billed) : "—"}</td>
                                  <td className="py-1.5 pr-3 text-right text-slate-700">{inv.expenses_billed > 0 ? formatCurrency(inv.expenses_billed) : "—"}</td>
                                  <td className="py-1.5 pr-3 text-right font-medium">{formatCurrency(inv.total_billed)}</td>
                                  <td className={`py-1.5 pr-3 text-right font-semibold ${inv.total_due > 0 ? "text-red-700" : "text-green-700"}`}>
                                    {formatCurrency(inv.total_due)}
                                  </td>
                                  <td className="py-1.5 pr-3 font-mono text-slate-400">{inv.ref_number ?? "—"}</td>
                                  <td className="py-1.5 font-mono text-slate-400">{inv.stmt_number ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-slate-200 font-semibold">
                                <td className="py-2 pr-3 text-xs text-slate-500 uppercase">Total</td>
                                <td className="py-2 pr-3"></td>
                                <td className="py-2 pr-3"></td>
                                <td className="py-2 pr-3 text-right text-slate-900">{formatCurrency(invTotalBilled)}</td>
                                <td className="py-2 pr-3 text-right text-red-700">{formatCurrency(invTotalDue)}</td>
                                <td></td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* ── Contact Tab ── */}
                {detailTab === "contact" && (
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Collections Contact</CardTitle>
                        {!editingContact && (
                          <button onClick={() => setEditingContact(true)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {!editingContact ? (
                        // Read mode
                        selected.ar_contact_name || selected.contact ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {selected.contact?.name ?? selected.ar_contact_name}
                                </p>
                                {selected.contact?.company && (
                                  <p className="text-xs text-slate-500">{selected.contact.company}</p>
                                )}
                                {(selected.ar_contact_email || selected.contact?.email) && (
                                  <a
                                    href={`mailto:${selected.ar_contact_email ?? selected.contact?.email}`}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                  >
                                    <Mail className="h-3 w-3" />
                                    {selected.ar_contact_email ?? selected.contact?.email}
                                  </a>
                                )}
                                {(selected.ar_contact_phone || selected.contact?.phone) && (
                                  <a
                                    href={`tel:${selected.ar_contact_phone ?? selected.contact?.phone}`}
                                    className="text-xs text-slate-600 hover:underline flex items-center gap-1 mt-0.5"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {selected.ar_contact_phone ?? selected.contact?.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                            {/* Quick action buttons */}
                            <div className="flex gap-2">
                              {(selected.ar_contact_email || selected.contact?.email) && (
                                <a
                                  href={`mailto:${selected.ar_contact_email ?? selected.contact?.email}?subject=Outstanding Invoice — ${selected.client_name}&body=Dear ${selected.contact?.name ?? selected.ar_contact_name ?? ""},\n\nI am writing regarding the outstanding balance of ${formatCurrency(selected.balance_due)} on matter ${selected.matter_number ?? selected.client_name}.\n\nPlease let us know when we can expect payment.\n\nThank you.`}
                                  className="flex items-center gap-1.5 text-xs rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
                                >
                                  <Mail className="h-3.5 w-3.5 text-blue-500" /> Draft Email
                                </a>
                              )}
                              {(selected.ar_contact_phone || selected.contact?.phone) && (
                                <a
                                  href={`tel:${selected.ar_contact_phone ?? selected.contact?.phone}`}
                                  className="flex items-center gap-1.5 text-xs rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
                                >
                                  <Phone className="h-3.5 w-3.5 text-green-500" /> Call
                                </a>
                              )}
                              <button
                                onClick={() => { setShowNoteDialog(true); setNoteForm(f => ({ ...f, type: "call" })); }}
                                className="flex items-center gap-1.5 text-xs rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
                              >
                                <Phone className="h-3.5 w-3.5 text-slate-400" /> Log Call
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <User className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No collections contact set</p>
                            <p className="text-xs text-slate-400 mt-1">Add the AP/AR person responsible at this client</p>
                            <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditingContact(true)}>Add Contact</Button>
                          </div>
                        )
                      ) : (
                        // Edit mode
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500">Enter the AP/AR contact responsible for this account. You can link to an existing contact or enter free-text details.</p>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Link to Existing Contact</Label>
                            <ContactSearch
                              value={contactForm.contactSearchVal}
                              onChange={v => setContactForm(f => ({ ...f, contactSearchVal: v, contact_id: "" }))}
                              onSelect={c => setContactForm(f => ({
                                ...f,
                                contact_id:       c.id,
                                contactSearchVal: c.name,
                                ar_contact_name:  f.ar_contact_name || c.name,
                                ar_contact_email: f.ar_contact_email || (c.email ?? ""),
                                ar_contact_phone: f.ar_contact_phone || (c.phone ?? ""),
                              }))}
                            />
                            {contactForm.contact_id && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Linked to contact record
                                <button onClick={() => setContactForm(f => ({ ...f, contact_id: "", contactSearchVal: "" }))} className="ml-1 text-slate-400 hover:text-red-500">
                                  <X className="h-3 w-3" />
                                </button>
                              </p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Name</Label>
                            <Input value={contactForm.ar_contact_name} onChange={e => setContactForm(f => ({ ...f, ar_contact_name: e.target.value }))} className="h-8 text-sm" placeholder="Jane Smith" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Email</Label>
                            <Input value={contactForm.ar_contact_email} onChange={e => setContactForm(f => ({ ...f, ar_contact_email: e.target.value }))} className="h-8 text-sm" type="email" placeholder="jane@clientco.com" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Phone</Label>
                            <Input value={contactForm.ar_contact_phone} onChange={e => setContactForm(f => ({ ...f, ar_contact_phone: e.target.value }))} className="h-8 text-sm" placeholder="(212) 555-1234" />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={saveContact} disabled={saving}>
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingContact(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Log Activity Dialog ── */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Collection Activity</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={noteForm.type} onValueChange={v => setNoteForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["call","email","meeting","note","promise","payment","document"].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Contact Name</Label>
                <Input
                  placeholder={selected?.ar_contact_name ?? "Who did you speak with?"}
                  value={noteForm.contact_name}
                  onChange={e => setNoteForm(f => ({ ...f, contact_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input placeholder="Brief summary of the interaction" value={noteForm.subject} onChange={e => setNoteForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea placeholder="Full details, promises made, next steps…" value={noteForm.notes} onChange={e => setNoteForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (if payment/promise)</Label>
                <Input type="number" placeholder="0.00" value={noteForm.amount} onChange={e => setNoteForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Follow-up Date</Label>
                <Input type="date" value={noteForm.follow_up_date} onChange={e => setNoteForm(f => ({ ...f, follow_up_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Document URL</Label>
              <Input placeholder="https://drive.google.com/…" value={noteForm.document_url} onChange={e => setNoteForm(f => ({ ...f, document_url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Status Dialog ── */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Collection Status</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusForm.status} onValueChange={v => setStatusForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["open","promised","partial","disputed","paid","written_off"].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Promise Amount</Label>
                <Input type="number" placeholder="0.00" value={statusForm.promise_amount} onChange={e => setStatusForm(f => ({ ...f, promise_amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Promise Date</Label>
                <Input type="date" value={statusForm.promise_date} onChange={e => setStatusForm(f => ({ ...f, promise_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Next Follow-up Date</Label>
              <Input type="date" value={statusForm.next_followup} onChange={e => setStatusForm(f => ({ ...f, next_followup: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={saveStatus} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
