"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Phone, Mail, Building2, Loader2 } from "lucide-react";
import { initials } from "@/lib/utils";
import type { Contact, ContactType } from "@/types";

const typeVariant: Record<ContactType, "default" | "success" | "info" | "warning" | "purple" | "secondary"> = {
  client: "success", prospect: "warning", referral_source: "purple",
  developer: "info", architect: "info", broker: "info",
  lender: "default", consultant: "secondary", government: "secondary", other: "secondary",
};

const typeLabel: Record<ContactType, string> = {
  client: "Client", prospect: "Prospect", referral_source: "Referral Source",
  developer: "Developer", architect: "Architect", broker: "Broker",
  lender: "Lender", consultant: "Consultant", government: "Government", other: "Other",
};

const filterTypes: Array<ContactType | "all"> = ["all", "client", "prospect", "referral_source", "developer", "lender", "architect"];

const EMPTY_FORM = {
  name: "", company: "", title: "", type: "other" as ContactType,
  email: "", phone: "", linkedin: "", birthday: "", notes: "",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactType | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchContacts, 300);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const handleAdd = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, company: form.company || null, title: form.title || null, email: form.email || null, phone: form.phone || null, linkedin: form.linkedin || null, birthday: form.birthday || null, notes: form.notes || null }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchContacts();
    } catch {
      setError("Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Contacts" subtitle={loading ? "Loading..." : `${contacts.length} contacts`} />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {filterTypes.map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {t === "all" ? "All" : typeLabel[t as ContactType]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search contacts..." className="w-56 pl-8 h-8 text-xs" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => { setShowAdd(true); setError(""); setForm(EMPTY_FORM); }}>
              <Plus className="h-3.5 w-3.5" /> Add Contact
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {/* Empty state */}
        {!loading && contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-slate-700">No contacts found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || filter !== "all" ? "Try adjusting your search or filter" : "Add a contact or import from CSV"}
            </p>
          </div>
        )}

        {/* Contact Grid */}
        {!loading && contacts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {contacts.map((contact) => (
              <Card key={contact.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-900 text-white text-sm">
                        {initials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 truncate">{contact.name}</p>
                        <Badge variant={typeVariant[contact.type as ContactType] ?? "secondary"} className="shrink-0 text-[10px]">
                          {typeLabel[contact.type as ContactType] ?? contact.type}
                        </Badge>
                      </div>
                      {contact.title && <p className="text-xs text-slate-600 truncate">{contact.title}</p>}
                      {contact.company && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <p className="text-xs text-slate-500 truncate">{contact.company}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {contact.notes && (
                    <p className="mt-3 text-xs text-slate-500 line-clamp-2 border-t border-slate-100 pt-2">{contact.notes}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 truncate" onClick={(e) => e.stopPropagation()}>
                        <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && !contact.email && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700" onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3 w-3" />{contact.phone}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Name *</Label>
                <Input placeholder="Full name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Company</Label>
                <Input placeholder="Organization" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input placeholder="Role / Title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as ContactType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(typeLabel) as ContactType[]).map(t => (
                      <SelectItem key={t} value={t}>{typeLabel[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Birthday</Label>
                <Input type="date" value={form.birthday} onChange={(e) => setForm(f => ({ ...f, birthday: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input placeholder="212-555-0100" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>LinkedIn</Label>
                <Input placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={(e) => setForm(f => ({ ...f, linkedin: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea placeholder="Relationship notes, preferences, context..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[80px]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
