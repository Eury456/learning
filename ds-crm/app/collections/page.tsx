"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle, DollarSign, Phone, Mail, MessageSquare,
  FileText, Plus, ChevronRight, Loader2, Calendar, Link,
  CheckCircle, Clock, TrendingDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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

const noteTypeIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: MessageSquare,
  note: FileText, promise: CheckCircle, payment: DollarSign, document: Link,
};

const noteTypeColors: Record<string, string> = {
  call: "bg-green-100 text-green-700",
  email: "bg-blue-100 text-blue-700",
  meeting: "bg-purple-100 text-purple-700",
  note: "bg-slate-100 text-slate-700",
  promise: "bg-amber-100 text-amber-700",
  payment: "bg-emerald-100 text-emerald-700",
  document: "bg-indigo-100 text-indigo-700",
};

const statusVariant: Record<string, "success" | "warning" | "info" | "destructive" | "secondary"> = {
  open: "warning", promised: "info", partial: "info",
  disputed: "destructive", paid: "success", written_off: "secondary",
};

function agingBucket(item: ARItem): string {
  if (item.days_181_plus > 0) return "181+";
  if (item.days_121_180 > 0) return "121-180";
  if (item.days_91_120 > 0) return "91-120";
  if (item.days_61_90 > 0) return "61-90";
  if (item.days_28_60 > 0) return "28-60";
  return "0-27";
}

function priorityLevel(item: ARItem): "critical" | "high" | "medium" | "low" {
  if (item.days_181_plus > 0 || item.days_121_180 > 0) return "critical";
  if (item.days_91_120 > 0) return "high";
  if (item.days_61_90 > 0 || item.days_28_60 > 0) return "medium";
  return "low";
}

const priorityColors: Record<string, string> = {
  critical: "border-l-4 border-l-red-500",
  high: "border-l-4 border-l-orange-400",
  medium: "border-l-4 border-l-amber-400",
  low: "border-l-4 border-l-slate-200",
};

export default function CollectionsPage() {
  const [items, setItems] = useState<ARItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ARItem | null>(null);
  const [notes, setNotes] = useState<CollectionNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [noteForm, setNoteForm] = useState({
    type: "call", subject: "", notes: "", contact_name: "",
    amount: "", follow_up_date: "", document_url: "",
  });
  const [statusForm, setStatusForm] = useState({
    status: "", promise_date: "", promise_amount: "", next_followup: "",
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/ar?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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

  const selectItem = (item: ARItem) => {
    setSelected(item);
    fetchNotes(item.id);
    setStatusForm({
      status: item.status,
      promise_date: item.promise_date ?? "",
      promise_amount: item.promise_amount?.toString() ?? "",
      next_followup: item.next_followup ?? "",
    });
  };

  const addNote = async () => {
    if (!selected || !noteForm.subject.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/collection-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ar_item_id: selected.id,
          type: noteForm.type,
          subject: noteForm.subject,
          notes: noteForm.notes || null,
          contact_name: noteForm.contact_name || null,
          amount: noteForm.amount ? parseFloat(noteForm.amount) : null,
          follow_up_date: noteForm.follow_up_date || null,
          document_url: noteForm.document_url || null,
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
      await fetch(`/api/ar/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusForm.status,
          promise_date: statusForm.promise_date || null,
          promise_amount: statusForm.promise_amount ? parseFloat(statusForm.promise_amount) : null,
          next_followup: statusForm.next_followup || null,
        }),
      });
      setShowStatusDialog(false);
      fetchItems();
      const updated = { ...selected, ...statusForm, promise_amount: statusForm.promise_amount ? parseFloat(statusForm.promise_amount) : null };
      setSelected(updated as ARItem);
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
  const sortedItems = [...filtered].sort((a, b) => {
    const pa = ["critical","high","medium","low"].indexOf(priorityLevel(a));
    const pb = ["critical","high","medium","low"].indexOf(priorityLevel(b));
    return pa !== pb ? pa - pb : b.balance_due - a.balance_due;
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Collections" subtitle="AR tracking and collection management" />

      <div className="flex-1 p-6 space-y-6">
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

        <div className="grid gap-6 lg:grid-cols-5">
          {/* AR List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {["all","open","promised","disputed","paid"].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {s}
                  </button>
                ))}
              </div>
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
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {sortedItems.map(item => {
                  const priority = priorityLevel(item);
                  const bucket = agingBucket(item);
                  const isSelected = selected?.id === item.id;
                  return (
                    <Card key={item.id}
                      className={`cursor-pointer transition-all ${priorityColors[priority]} ${isSelected ? "ring-2 ring-slate-900" : "hover:shadow-md"}`}
                      onClick={() => selectItem(item)}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{item.client_name}</p>
                            {item.matter_number && <p className="text-xs text-slate-400 font-mono">{item.matter_number}</p>}
                            {item.matter_description && <p className="text-xs text-slate-500 truncate">{item.matter_description}</p>}
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={statusVariant[item.status] ?? "secondary"} className="text-[10px] capitalize">{item.status}</Badge>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              bucket === "181+" ? "bg-red-100 text-red-700" :
                              bucket === "121-180" ? "bg-red-100 text-red-700" :
                              bucket === "91-120" ? "bg-orange-100 text-orange-700" :
                              bucket === "61-90" ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>{bucket} days</span>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(item.balance_due)}</p>
                        </div>
                        {item.next_followup && (
                          <p className={`mt-1 text-[10px] flex items-center gap-1 ${
                            new Date(item.next_followup) <= new Date() ? "text-red-600 font-semibold" : "text-slate-400"
                          }`}>
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

          {/* Detail Panel */}
          <div className="lg:col-span-3">
            {!selected ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-20">
                  <p className="text-sm text-slate-400">Select a matter to view collection details</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Matter Header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-base">{selected.client_name}</p>
                        {selected.matter_number && <p className="text-xs text-slate-400 font-mono">{selected.matter_number}</p>}
                        {selected.matter_description && <p className="text-sm text-slate-600 mt-0.5">{selected.matter_description}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setShowStatusDialog(true)}>Update Status</Button>
                    </div>

                    {/* Aging breakdown */}
                    <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                      {[
                        { label: "0-27", val: selected.days_0_27, color: "bg-slate-100" },
                        { label: "28-60", val: selected.days_28_60, color: "bg-amber-50" },
                        { label: "61-90", val: selected.days_61_90, color: "bg-amber-100" },
                        { label: "91-120", val: selected.days_91_120, color: "bg-orange-100" },
                        { label: "121-180", val: selected.days_121_180, color: "bg-red-100" },
                        { label: "181+", val: selected.days_181_plus, color: "bg-red-200" },
                        { label: "Total", val: selected.balance_due, color: "bg-slate-900" },
                      ].map(({ label, val, color }) => (
                        <div key={label} className={`rounded p-1.5 ${color}`}>
                          <p className={`text-[9px] font-medium ${color === "bg-slate-900" ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
                          <p className={`text-xs font-bold ${color === "bg-slate-900" ? "text-white" : val > 0 ? "text-slate-900" : "text-slate-300"}`}>
                            {val > 0 ? formatCurrency(val) : "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Status info */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
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

                {/* Communication Log */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Collection Log</CardTitle>
                      <Button size="sm" onClick={() => setShowNoteDialog(true)}>
                        <Plus className="h-3.5 w-3.5" /> Log Activity
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-96 overflow-y-auto">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Activity Dialog */}
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
                <Input placeholder="Who did you speak with?" value={noteForm.contact_name} onChange={e => setNoteForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input placeholder="Brief summary of the interaction" value={noteForm.subject} onChange={e => setNoteForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea placeholder="Full details of the conversation, promises made, next steps..." value={noteForm.notes} onChange={e => setNoteForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[80px]" />
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
              <Label>Document URL (invoice, email, etc.)</Label>
              <Input placeholder="https://drive.google.com/..." value={noteForm.document_url} onChange={e => setNoteForm(f => ({ ...f, document_url: e.target.value }))} />
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

      {/* Update Status Dialog */}
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
