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
import { Plus, CheckCircle, Circle, AlertCircle, Clock, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority, Contact, Matter } from "@/types";

const priorityVariant: Record<TaskPriority, "destructive" | "warning" | "info" | "secondary"> = {
  urgent: "destructive",
  high: "warning",
  medium: "info",
  low: "secondary",
};

const statusGroups: Array<{ label: string; statuses: TaskStatus[]; icon: React.ElementType; iconClass: string }> = [
  { label: "Overdue", statuses: ["overdue"], icon: AlertCircle, iconClass: "text-red-500" },
  { label: "In Progress", statuses: ["in_progress"], icon: Clock, iconClass: "text-blue-500" },
  { label: "Due Soon", statuses: ["pending"], icon: Circle, iconClass: "text-slate-400" },
  { label: "Completed", statuses: ["completed"], icon: CheckCircle, iconClass: "text-green-500" },
];

interface TaskForm {
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  contact_id: string;
  contactName: string;
  matter_id: string;
  matterTitle: string;
  recurring: boolean;
  recurrence_pattern: string;
}

const defaultForm: TaskForm = {
  title: "",
  description: "",
  due_date: "",
  priority: "medium",
  status: "pending",
  contact_id: "",
  contactName: "",
  matter_id: "",
  matterTitle: "",
  recurring: false,
  recurrence_pattern: "",
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split("T")[0];

  const effectiveStatus = (task: Task): TaskStatus => {
    if (task.status === "completed") return "completed";
    if (task.status === "in_progress") return "in_progress";
    if (task.status === "overdue") return "overdue";
    if (task.due_date && task.due_date < today) return "overdue";
    return "pending";
  };

  const openAdd = () => {
    setEditingTask(null);
    setForm(defaultForm);
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    const contact = task.contact as Contact | undefined;
    const matter = task.matter as Matter | undefined;
    setForm({
      title: task.title,
      description: task.description ?? "",
      due_date: task.due_date ?? "",
      priority: task.priority,
      status: task.status,
      contact_id: task.contact_id ?? "",
      contactName: contact?.name ?? "",
      matter_id: task.matter_id ?? "",
      matterTitle: matter?.title ?? "",
      recurring: task.recurring,
      recurrence_pattern: task.recurrence_pattern ?? "",
    });
    setFormError("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setSaving(true);
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
      contact_id: form.contact_id || null,
      matter_id: form.matter_id || null,
      recurring: form.recurring,
      recurrence_pattern: form.recurring ? (form.recurrence_pattern.trim() || null) : null,
    };
    const res = editingTask
      ? await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/tasks", {
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

  const handleDelete = async () => {
    if (!editingTask) return;
    if (!confirm(`Delete "${editingTask.title}"?`)) return;
    await fetch(`/api/tasks/${editingTask.id}`, { method: "DELETE" });
    setShowDialog(false);
    load();
  };

  const toggleComplete = async (task: Task) => {
    const isCompleted = effectiveStatus(task) === "completed";
    const newStatus: TaskStatus = isCompleted ? "pending" : "completed";
    setToggling(task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setToggling(null);
  };

  const filters: Array<"all" | TaskStatus> = ["all", "overdue", "in_progress", "pending", "completed"];

  const openCount = tasks.filter(t => effectiveStatus(t) !== "completed").length;

  const getFilteredTasks = (statuses: TaskStatus[]) =>
    tasks.filter(t => {
      const eff = effectiveStatus(t);
      return (filter === "all" || statuses.includes(filter as TaskStatus)) && statuses.includes(eff);
    });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Tasks"
        subtitle={loading ? "Loading..." : `${openCount} open tasks`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f === "all" ? "All" : f.replace("_", " ")}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Loading tasks...
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-500 font-medium">No tasks yet</p>
            <p className="text-slate-400 text-sm mt-1">Click &quot;Add Task&quot; to create your first task.</p>
          </div>
        )}

        {/* Task Groups */}
        {!loading && tasks.length > 0 && (
          <div className="space-y-6">
            {statusGroups.map(({ label, statuses, icon: Icon, iconClass }) => {
              const groupTasks = getFilteredTasks(statuses);
              if (groupTasks.length === 0) return null;
              return (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${iconClass}`} />
                    <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
                    <span className="text-xs text-slate-400">({groupTasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {groupTasks.map(task => {
                      const done = effectiveStatus(task) === "completed";
                      const contact = task.contact as Contact | undefined;
                      const matter = task.matter as Matter | undefined;
                      return (
                        <Card key={task.id} className={done ? "opacity-60" : ""}>
                          <div className="flex items-start gap-3 p-4">
                            <button
                              onClick={() => toggleComplete(task)}
                              disabled={toggling === task.id}
                              className="mt-0.5 shrink-0 transition-colors"
                            >
                              {done ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-slate-300 hover:text-slate-500" />
                              )}
                            </button>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => openEdit(task)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium ${done ? "line-through text-slate-400" : "text-slate-900"}`}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant={priorityVariant[task.priority]} className="text-[10px] capitalize">
                                    {task.priority}
                                  </Badge>
                                  {task.recurring && task.recurrence_pattern && (
                                    <span className="text-[10px] text-slate-400 capitalize">{task.recurrence_pattern}</span>
                                  )}
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {contact?.name && (
                                  <span className="text-xs text-slate-500">{contact.name}</span>
                                )}
                                {matter?.title && (
                                  <>
                                    {contact?.name && <span className="text-xs text-slate-300">·</span>}
                                    <span className="text-xs text-slate-500 italic">{matter.title}</span>
                                  </>
                                )}
                                {task.due_date && (
                                  <>
                                    <span className="text-xs text-slate-300">·</span>
                                    <span className={`text-xs font-medium ${effectiveStatus(task) === "overdue" ? "text-red-600" : "text-slate-500"}`}>
                                      Due {formatDate(task.due_date)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Follow up on HPD submission"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as TaskPriority }))}>
                  <SelectTrigger id="task-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["urgent","high","medium","low"] as TaskPriority[]).map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-status">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TaskStatus }))}>
                  <SelectTrigger id="task-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pending","in_progress","completed","overdue"] as TaskStatus[]).map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
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
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional details or context..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="task-recurring"
                type="checkbox"
                checked={form.recurring}
                onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="task-recurring" className="cursor-pointer">Recurring task</Label>
            </div>
            {form.recurring && (
              <div>
                <Label htmlFor="task-pattern">Recurrence Pattern</Label>
                <Input
                  id="task-pattern"
                  value={form.recurrence_pattern}
                  onChange={e => setForm(f => ({ ...f, recurrence_pattern: e.target.value }))}
                  placeholder="e.g. monthly, quarterly, yearly"
                />
              </div>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter className="flex items-center justify-between">
            {editingTask ? (
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
                {saving ? "Saving..." : editingTask ? "Save Changes" : "Add Task"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
