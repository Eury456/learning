"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Phone, Users, Mail, Calendar, MessageSquare, FileText, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Activity, ActivityType, Contact, Matter } from "@/types";

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  event: Calendar,
  follow_up: MessageSquare,
  internal: FileText,
  other: FileText,
};

const activityVariant: Record<ActivityType, "success" | "info" | "default" | "purple" | "warning" | "secondary"> = {
  call: "success",
  meeting: "info",
  email: "default",
  event: "purple",
  follow_up: "warning",
  internal: "secondary",
  other: "secondary",
};

const activityBg: Record<ActivityType, string> = {
  call: "bg-green-100",
  meeting: "bg-blue-100",
  email: "bg-slate-100",
  event: "bg-purple-100",
  follow_up: "bg-amber-100",
  internal: "bg-slate-100",
  other: "bg-slate-100",
};

const ACTIVITY_TYPES: ActivityType[] = ["call","meeting","email","event","follow_up","internal","other"];

interface ActivityForm {
  type: ActivityType;
  subject: string;
  notes: string;
  activity_date: string;
  contact_id: string;
  contactName: string;
  matter_id: string;
  matterTitle: string;
}

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const defaultForm: ActivityForm = {
  type: "call",
  subject: "",
  notes: "",
  activity_date: localNow(),
  contact_id: "",
  contactName: "",
  matter_id: "",
  matterTitle: "",
};

function ContactSearch({ value, displayName, onSelect }: {
  value: string; displayName: string; onSelect: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState(displayName);
  const [results, setResults] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearch(displayName); }, [displayName]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (search.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      setOpen(true);
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [search]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={search}
        onChange={e => { setSearch(e.target.value); if (!e.target.value) onSelect("", ""); }}
        placeholder="Search contacts (optional)..."
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
              onMouseDown={e => {
                e.preventDefault();
                onSelect(c.id, c.name);
                setSearch(c.name);
                setOpen(false);
              }}
            >
              <span className="font-medium">{c.name}</span>
              {c.company && <span className="text-slate-400 text-xs ml-1">· {c.company}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MatterSearch({ value, displayName, onSelect }: {
  value: string; displayName: string; onSelect: (id: string, title: string) => void;
}) {
  const [search, setSearch] = useState(displayName);
  const [results, setResults] = useState<Matter[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearch(displayName); }, [displayName]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (search.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch("/api/matters");
      const data = await res.json();
      const filtered = Array.isArray(data)
        ? data.filter((m: Matter) => m.title.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
        : [];
      setResults(filtered);
      setOpen(true);
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [search]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={search}
        onChange={e => { setSearch(e.target.value); if (!e.target.value) onSelect("", ""); }}
        placeholder="Search matters (optional)..."
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
          {results.map(m => (
            <button
              key={m.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
              onMouseDown={e => {
                e.preventDefault();
                onSelect(m.id, m.title);
                setSearch(m.title);
                setOpen(false);
              }}
            >
              {m.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<ActivityForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/activities?limit=100");
    const data = await res.json();
    setActivities(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const types: Array<ActivityType | "all"> = ["all", "call", "meeting", "email", "event", "follow_up", "internal"];

  const filtered = activities.filter(a => {
    const contact = (a.contact as Contact | undefined);
    const matter = (a.matter as Matter | undefined);
    const matchesSearch =
      a.subject.toLowerCase().includes(search.toLowerCase()) ||
      (contact?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (matter?.title ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openLog = () => {
    setForm({ ...defaultForm, activity_date: localNow() });
    setFormError("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.subject.trim()) { setFormError("Subject is required."); return; }
    setSaving(true);
    const body = {
      type: form.type,
      subject: form.subject.trim(),
      notes: form.notes.trim() || null,
      activity_date: form.activity_date ? new Date(form.activity_date).toISOString() : new Date().toISOString(),
      contact_id: form.contact_id || null,
      matter_id: form.matter_id || null,
    };
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setFormError(data.error); return; }
    setShowDialog(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    setDeletingId(id);
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Activity Log"
        subtitle={loading ? "Loading..." : `${activities.length} logged activities`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "all" ? "All" : t.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search activities..."
                className="w-56 pl-8 h-8 text-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={openLog}>
              <Plus className="h-3.5 w-3.5" />
              Log Activity
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Loading activities...
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-500 font-medium">No activities logged yet</p>
            <p className="text-slate-400 text-sm mt-1">Click &quot;Log Activity&quot; to record your first interaction.</p>
          </div>
        )}

        {/* Activity Feed */}
        {!loading && filtered.length > 0 && (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-4">
              {filtered.map(activity => {
                const Icon = activityIcons[activity.type];
                const contact = activity.contact as Contact | undefined;
                const matter = activity.matter as Matter | undefined;
                return (
                  <div key={activity.id} className="relative flex gap-4 pl-2">
                    <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${activityBg[activity.type]}`}>
                      <Icon className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <Card className="flex-1">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">{activity.subject}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant={activityVariant[activity.type]} className="text-[10px] capitalize">
                                {activity.type.replace("_", " ")}
                              </Badge>
                              {contact?.name && (
                                <span className="text-xs text-slate-500">{contact.name}</span>
                              )}
                              {matter?.title && (
                                <>
                                  <span className="text-xs text-slate-300">·</span>
                                  <span className="text-xs text-slate-500 italic">{matter.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">{formatDate(activity.activity_date)}</span>
                            <button
                              onClick={() => handleDelete(activity.id)}
                              disabled={deletingId === activity.id}
                              className="text-slate-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {activity.notes && (
                          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{activity.notes}</p>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && activities.length > 0 && filtered.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">No activities match your filter.</p>
        )}
      </div>

      {/* Log Activity Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="act-type">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ActivityType }))}>
                  <SelectTrigger id="act-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="act-date">Date &amp; Time</Label>
                <Input
                  id="act-date"
                  type="datetime-local"
                  value={form.activity_date}
                  onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="act-subject">Subject *</Label>
              <Input
                id="act-subject"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Call re: ULURP timeline"
              />
            </div>
            <div>
              <Label>Contact</Label>
              <ContactSearch
                value={form.contact_id}
                displayName={form.contactName}
                onSelect={(id, name) => setForm(f => ({ ...f, contact_id: id, contactName: name }))}
              />
            </div>
            <div>
              <Label>Matter</Label>
              <MatterSearch
                value={form.matter_id}
                displayName={form.matterTitle}
                onSelect={(id, title) => setForm(f => ({ ...f, matter_id: id, matterTitle: title }))}
              />
            </div>
            <div>
              <Label htmlFor="act-notes">Notes</Label>
              <Textarea
                id="act-notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key discussion points, action items, next steps..."
                rows={4}
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Log Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
