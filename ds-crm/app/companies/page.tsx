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
import { Plus, Search, Trash2, Globe, Phone, Mail, MapPin } from "lucide-react";
import { initials } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  type: string;
  borough: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const COMPANY_TYPES = [
  { value: "developer",      label: "Developer" },
  { value: "architect_firm", label: "Architecture Firm" },
  { value: "law_firm",       label: "Law Firm" },
  { value: "lender",         label: "Lender" },
  { value: "brokerage",      label: "Brokerage" },
  { value: "agency",         label: "Agency" },
  { value: "expediter",      label: "Expediter" },
  { value: "consultant",     label: "Consultant" },
  { value: "other",          label: "Other" },
];

const typeVariant: Record<string, "info" | "purple" | "success" | "warning" | "secondary" | "default"> = {
  developer:      "info",
  architect_firm: "purple",
  law_firm:       "default",
  lender:         "success",
  brokerage:      "warning",
  agency:         "secondary",
  expediter:      "secondary",
  consultant:     "secondary",
  other:          "secondary",
};

const typeColors: Record<string, string> = {
  developer:      "bg-blue-600",
  architect_firm: "bg-purple-600",
  law_firm:       "bg-slate-700",
  lender:         "bg-green-600",
  brokerage:      "bg-amber-600",
  agency:         "bg-teal-600",
  expediter:      "bg-orange-600",
  consultant:     "bg-indigo-600",
  other:          "bg-slate-500",
};

interface CompanyForm {
  name: string;
  type: string;
  borough: string;
  address: string;
  website: string;
  phone: string;
  email: string;
  notes: string;
}

const defaultForm: CompanyForm = {
  name: "",
  type: "developer",
  borough: "",
  address: "",
  website: "",
  phone: "",
  email: "",
  notes: "",
};

const TYPE_FILTERS = ["all", ...COMPANY_TYPES.map(t => t.value)];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/companies?${params}`);
    const data = await res.json();
    setCompanies(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [typeFilter, search]);

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

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      name:    company.name,
      type:    company.type,
      borough: company.borough ?? "",
      address: company.address ?? "",
      website: company.website ?? "",
      phone:   company.phone ?? "",
      email:   company.email ?? "",
      notes:   company.notes ?? "",
    });
    setError("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Company name is required."); return; }
    setSaving(true);
    const body = {
      name:    form.name.trim(),
      type:    form.type,
      borough: form.borough.trim() || null,
      address: form.address.trim() || null,
      website: form.website.trim() || null,
      phone:   form.phone.trim() || null,
      email:   form.email.trim() || null,
      notes:   form.notes.trim() || null,
    };
    const res = editing
      ? await fetch(`/api/companies/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/companies", {
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
    if (!confirm(`Delete "${editing.name}"? Contacts linked to this company will be unlinked.`)) return;
    await fetch(`/api/companies/${editing.id}`, { method: "DELETE" });
    setShowDialog(false);
    load();
  };

  const typeLabel = (type: string) =>
    COMPANY_TYPES.find(t => t.value === type)?.label ?? type;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Companies"
        subtitle={loading ? "Loading..." : `${companies.length} ${typeFilter === "all" ? "companies" : typeLabel(typeFilter).toLowerCase() + "s"}`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search companies..."
              className="w-56 pl-8 h-8 text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Company
          </Button>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                typeFilter === t
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "all" ? "All" : typeLabel(t)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading...</div>
        )}

        {!loading && companies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-500 font-medium">No companies found</p>
            <p className="text-slate-400 text-sm mt-1">Click &quot;Add Company&quot; to get started.</p>
          </div>
        )}

        {/* Companies Grid */}
        {!loading && companies.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map(company => (
              <Card
                key={company.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openEdit(company)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold ${typeColors[company.type] ?? "bg-slate-500"}`}>
                      {initials(company.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 leading-snug truncate">{company.name}</p>
                      <Badge variant={typeVariant[company.type] ?? "secondary"} className="mt-1 text-[10px]">
                        {typeLabel(company.type)}
                      </Badge>
                    </div>
                  </div>

                  {/* Location */}
                  {(company.borough || company.address) && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {[company.borough, company.address].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="mt-1.5 space-y-0.5">
                    {company.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span>
                      </div>
                    )}
                  </div>

                  {company.notes && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2">{company.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="co-name">Company Name *</Label>
              <Input
                id="co-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Related Companies"
              />
            </div>

            <div>
              <Label htmlFor="co-type">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger id="co-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="co-borough">Borough</Label>
                <Select value={form.borough || "__none__"} onValueChange={v => setForm(f => ({ ...f, borough: v === "__none__" ? "" : v }))}>
                  <SelectTrigger id="co-borough"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {["Manhattan","Brooklyn","Queens","Bronx","Staten Island"].map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="co-phone">Phone</Label>
                <Input
                  id="co-phone"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(212) 555-0100"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="co-address">Address</Label>
              <Input
                id="co-address"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. 30 Hudson Yards, New York, NY 10001"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="co-email">Email</Label>
                <Input
                  id="co-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="info@company.com"
                />
              </div>
              <div>
                <Label htmlFor="co-website">Website</Label>
                <Input
                  id="co-website"
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="company.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="co-notes">Notes</Label>
              <Textarea
                id="co-notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key contacts, relationship notes, current projects..."
                rows={3}
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
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Company"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
