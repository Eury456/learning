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
import { Plus, Search, Trash2, MapPin, Building, User, RefreshCw } from "lucide-react";
import { ContactSearch } from "@/components/ui/contact-search";
import type { Contact } from "@/types";

interface Company {
  id: string;
  name: string;
  type: string;
}

interface Project {
  id: string;
  name: string;
  address: string | null;
  borough: string | null;
  block: string | null;
  lot: string | null;
  zoning_district: string | null;
  status: string;
  description: string | null;
  developer_id: string | null;
  developer?: Contact;
  company_id: string | null;
  company?: Company;
  zoning_programs: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const STATUS_OPTS = [
  { value: "active",    label: "Active" },
  { value: "prospect",  label: "Prospect" },
  { value: "on_hold",   label: "On Hold" },
  { value: "closed",    label: "Closed" },
];

const statusVariant: Record<string, "success" | "warning" | "secondary" | "info"> = {
  active:   "success",
  prospect: "warning",
  on_hold:  "secondary",
  closed:   "info",
};

const ZONING_PROGRAMS = [
  "MIH", "UAP", "485-x", "467-m", "Article XI",
  "421-a", "PFASH", "FRESH", "SoHo/NoHo", "EDC",
  "HPD", "HFA", "LPC", "BSA",
];

interface ProjectForm {
  name: string;
  address: string;
  borough: string;
  block: string;
  lot: string;
  zoning_district: string;
  status: string;
  description: string;
  developer_id: string;
  developerName: string;
  company_id: string;
  companyName: string;
  zoning_programs: string[];
  custom_program: string;
  notes: string;
}

const defaultForm: ProjectForm = {
  name: "",
  address: "",
  borough: "",
  block: "",
  lot: "",
  zoning_district: "",
  status: "active",
  description: "",
  developer_id: "",
  developerName: "",
  company_id: "",
  companyName: "",
  zoning_programs: [],
  custom_program: "",
  notes: "",
};


function CompanySearch({ value, displayName, onSelect }: {
  value: string; displayName: string; onSelect: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState(displayName);
  const [results, setResults] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearch(displayName); }, [displayName]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (search.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/companies?search=${encodeURIComponent(search)}`);
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
        placeholder="Search companies..."
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg max-h-44 overflow-y-auto">
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
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toggleProgram(programs: string[], program: string): string[] {
  return programs.includes(program)
    ? programs.filter(p => p !== program)
    : [...programs, program];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [boroughFilter, setBoroughFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (boroughFilter !== "all") params.set("borough", boroughFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/projects?${params}`);
    const data = await res.json();
    setProjects(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [boroughFilter, statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm);
    setError("");
    setShowDialog(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({
      name:            project.name,
      address:         project.address ?? "",
      borough:         project.borough ?? "",
      block:           project.block ?? "",
      lot:             project.lot ?? "",
      zoning_district: project.zoning_district ?? "",
      status:          project.status,
      description:     project.description ?? "",
      developer_id:    project.developer_id ?? "",
      developerName:   (project.developer as Contact | undefined)?.name ?? "",
      company_id:      project.company_id ?? "",
      companyName:     project.company?.name ?? "",
      zoning_programs: project.zoning_programs ?? [],
      custom_program:  "",
      notes:           project.notes ?? "",
    });
    setError("");
    setShowDialog(true);
  };

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; skipped: number } | null>(null);

  const handleSyncFromMatters = async () => {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/projects/sync-from-matters", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!data.error) {
      setSyncResult({ created: data.created, skipped: data.skipped });
      load();
    }
  };

  const addCustomProgram = () => {
    const prog = form.custom_program.trim();
    if (!prog || form.zoning_programs.includes(prog)) { setForm(f => ({ ...f, custom_program: "" })); return; }
    setForm(f => ({ ...f, zoning_programs: [...f.zoning_programs, prog], custom_program: "" }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setSaving(true);
    const body = {
      name:            form.name.trim(),
      address:         form.address.trim() || null,
      borough:         form.borough || null,
      block:           form.block.trim() || null,
      lot:             form.lot.trim() || null,
      zoning_district: form.zoning_district.trim() || null,
      status:          form.status,
      description:     form.description.trim() || null,
      developer_id:    form.developer_id || null,
      company_id:      form.company_id || null,
      zoning_programs: form.zoning_programs,
      notes:           form.notes.trim() || null,
    };
    const res = editing
      ? await fetch(`/api/projects/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/projects", {
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
    if (!editing) return;
    if (!confirm(`Delete "${editing.name}"? This cannot be undone.`)) return;
    await fetch(`/api/projects/${editing.id}`, { method: "DELETE" });
    setShowDialog(false);
    load();
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Projects & Sites"
        subtitle={loading ? "Loading..." : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search projects..."
              className="w-56 pl-8 h-8 text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSyncFromMatters} disabled={syncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync from Matters"}
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          {/* Borough filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500">Borough:</span>
            {["all", ...BOROUGHS].map(b => (
              <button
                key={b}
                onClick={() => setBoroughFilter(b)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  boroughFilter === b
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {b === "all" ? "All" : b}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            {["all", ...STATUS_OPTS.map(s => s.value)].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s === "all" ? "All" : STATUS_OPTS.find(o => o.value === s)?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {syncResult && (
          <div className="rounded-lg bg-green-50 border border-green-100 p-3 flex items-center justify-between">
            <p className="text-xs font-medium text-green-700">
              &#10003; Sync complete — {syncResult.created} project{syncResult.created !== 1 ? "s" : ""} created from Matters
              {syncResult.skipped > 0 && `, ${syncResult.skipped} already existed`}.
            </p>
            <button onClick={() => setSyncResult(null)} className="text-green-400 hover:text-green-600 text-xs ml-4">✕</button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading...</div>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-500 font-medium">No projects found</p>
            <p className="text-slate-400 text-sm mt-1">Click &quot;New Project&quot; to add your first site.</p>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {projects.map(project => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{
                  borderLeftColor:
                    project.status === "active"   ? "#22c55e" :
                    project.status === "prospect" ? "#f59e0b" :
                    project.status === "on_hold"  ? "#94a3b8" :
                    "#64748b",
                }}
                onClick={() => openEdit(project)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 leading-snug">{project.name}</p>
                      <Badge
                        variant={statusVariant[project.status] ?? "secondary"}
                        className="mt-1 text-[10px]"
                      >
                        {STATUS_OPTS.find(s => s.value === project.status)?.label ?? project.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Location */}
                  {(project.address || project.borough) && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>
                        {[project.address, project.borough].filter(Boolean).join(", ")}
                        {project.block && ` · Block ${project.block}`}
                        {project.lot && ` Lot ${project.lot}`}
                      </span>
                    </div>
                  )}

                  {/* Developer / Company */}
                  {(project.developer || project.company) && (
                    <div className="mt-1.5 space-y-0.5">
                      {project.developer && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <User className="h-3 w-3 shrink-0" />
                          <span>{(project.developer as Contact).name}</span>
                        </div>
                      )}
                      {project.company && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Building className="h-3 w-3 shrink-0" />
                          <span>{project.company.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zoning Programs */}
                  {project.zoning_programs && project.zoning_programs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {project.zoning_programs.map(prog => (
                        <span
                          key={prog}
                          className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700"
                        >
                          {prog}
                        </span>
                      ))}
                    </div>
                  )}

                  {project.description && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2">{project.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name + Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="proj-name">Project / Site Name *</Label>
                <Input
                  id="proj-name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. 145 W 28th Street Rezoning"
                />
              </div>
              <div>
                <Label htmlFor="proj-status">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger id="proj-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address + Borough */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="proj-address">Address</Label>
                <Input
                  id="proj-address"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 145 W 28th Street"
                />
              </div>
              <div>
                <Label htmlFor="proj-borough">Borough</Label>
                <Select value={form.borough || "__none__"} onValueChange={v => setForm(f => ({ ...f, borough: v === "__none__" ? "" : v }))}>
                  <SelectTrigger id="proj-borough"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {BOROUGHS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Block / Lot / Zoning */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="proj-block">Block</Label>
                <Input
                  id="proj-block"
                  value={form.block}
                  onChange={e => setForm(f => ({ ...f, block: e.target.value }))}
                  placeholder="e.g. 0812"
                />
              </div>
              <div>
                <Label htmlFor="proj-lot">Lot</Label>
                <Input
                  id="proj-lot"
                  value={form.lot}
                  onChange={e => setForm(f => ({ ...f, lot: e.target.value }))}
                  placeholder="e.g. 0047"
                />
              </div>
              <div>
                <Label htmlFor="proj-zoning">Zoning District</Label>
                <Input
                  id="proj-zoning"
                  value={form.zoning_district}
                  onChange={e => setForm(f => ({ ...f, zoning_district: e.target.value }))}
                  placeholder="e.g. C6-2A"
                />
              </div>
            </div>

            {/* Developer contact + Company */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Developer (Contact)</Label>
                <ContactSearch
                  value={form.developer_id}
                  displayName={form.developerName}
                  onSelect={(id, name) => setForm(f => ({ ...f, developer_id: id, developerName: name }))}
                  placeholder="Search for developer contact..."
                />
              </div>
              <div>
                <Label>Developer (Company)</Label>
                <CompanySearch
                  value={form.company_id}
                  displayName={form.companyName}
                  onSelect={(id, name) => setForm(f => ({ ...f, company_id: id, companyName: name }))}
                />
              </div>
            </div>

            {/* Zoning Programs */}
            <div>
              <Label className="mb-2 block">Zoning Programs</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {ZONING_PROGRAMS.map(prog => {
                  const selected = form.zoning_programs.includes(prog);
                  return (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, zoning_programs: toggleProgram(f.zoning_programs, prog) }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600"
                      }`}
                    >
                      {prog}
                    </button>
                  );
                })}
              </div>
              {/* Custom program */}
              <div className="flex gap-2">
                <Input
                  value={form.custom_program}
                  onChange={e => setForm(f => ({ ...f, custom_program: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomProgram(); } }}
                  placeholder="Other program (press Enter to add)..."
                  className="text-xs h-8"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addCustomProgram}
                  className="h-8 text-xs shrink-0"
                >
                  Add
                </Button>
              </div>
              {/* Show any custom programs that were added */}
              {form.zoning_programs.filter(p => !ZONING_PROGRAMS.includes(p)).map(prog => (
                <span
                  key={prog}
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white mr-1"
                >
                  {prog}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, zoning_programs: f.zoning_programs.filter(p => p !== prog) }))}
                    className="ml-0.5 text-amber-200 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="proj-desc">Description</Label>
              <Textarea
                id="proj-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Project overview, key issues, history..."
                rows={2}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="proj-notes">Notes</Label>
              <Textarea
                id="proj-notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes, strategy, key contacts..."
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter className="flex items-center justify-between">
            {editing ? (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
