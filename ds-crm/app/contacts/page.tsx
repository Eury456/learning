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
import { Plus, Search, Phone, Mail, Building2, Loader2, Pencil, Trash2 } from "lucide-react";
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
  family_notes: "", interests: "", personality_notes: "",
};

type FormState = typeof EMPTY_FORM;

function contactToForm(c: Contact): FormState {
  return {
    name: c.name ?? "",
    company: c.company ?? "",
    title: c.title ?? "",
    type: (c.type as ContactType) ?? "other",
    email: c.email ?? "",
    phone: c.phone ?? "",
    linkedin: c.linkedin ?? "",
    birthday: c.birthday ?? "",
    notes: c.notes ?? "",
    family_notes: c.family_notes ?? "",
    interests: c.interests ?? "",
    personality_notes: c.personality_notes ?? "",
  };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactType | "all">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const openAdd = () => {
    setEditingContact(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowDialog(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm(contactToForm(contact));
    setError("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    const body = {
      name: form.name.trim(),
      company: form.company || null,
      title: form.title || null,
      type: form.type,
      email: form.email || null,
      phone: form.phone || null,
      linkedin: form.linkedin || null,
      birthday: form.birthday || null,
      notes: form.notes || null,
      family_notes: form.family_notes || null,
      interests: form.interests || null,
      personality_notes: form.personality_notes || null,
    };
    try {
      const res = editingContact
        ? await fetch(`/api/contacts/${editingContact.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setShowDialog(false);
      fetchContacts();
    } catch {
      setError("Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingContact) return;
    if (!confirm(`Delete ${editingContact.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/contacts/${editingContact.id}`, { method: "DELETE" });
      setShowDialog(false);
      fetchContacts();
    } catch {
      setError("Failed to delete contact");
    } finally {
      setDeleting(false);
    }
  };

  const setField = (key: keyof FormState, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

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
            <Button size="sm" onClick={openAdd}>
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
              <Card key={contact.id}
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => openEdit(contact)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-slate-900 text-white text-sm">
                        {initials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 truncate">{contact.name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant={typeVariant[contact.type as ContactType] ?? "secondary"} className="text-[10px]">
                            {typeLabel[contact.type as ContactType] ?? contact.type}
                          </Badge>
                          <Pencil className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </div>
                      {contact.title && <p className="text-xs text-slate-600 truncate">{contact.title}</p>}
                      {contact.company && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-500 truncate">{contact.company}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Always show both email and phone if present */}
                  <div className="mt-3 space-y-1">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 truncate"
                        onClick={(e) => e.stopPropagation()}>
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700"
                        onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3 w-3 shrink-0" />
                        {contact.phone}
                      </a>
                    )}
                  </div>

                  {contact.notes && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2 border-t border-slate-100 pt-2">
                      {contact.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContact ? `Edit — ${editingContact.name}` : "Add Contact"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Name *</Label>
                <Input placeholder="Full name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Company</Label>
                <Input placeholder="Organization" value={form.company} onChange={(e) => setField("company", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input placeholder="Role / Title" value={form.title} onChange={(e) => setField("title", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setField("type", v)}>
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
                <Input type="date" value={form.birthday} onChange={(e) => setField("birthday", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input placeholder="212-555-0100" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>LinkedIn</Label>
                <Input placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={(e) => setField("linkedin", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea placeholder="Relationship notes, context..." value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="min-h-[60px]" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Family / Personal</Label>
                <Textarea placeholder="Spouse, kids, personal details..." value={form.family_notes} onChange={(e) => setField("family_notes", e.target.value)} className="min-h-[50px]" />
              </div>
              <div className="space-y-1">
                <Label>Interests</Label>
                <Input placeholder="Golf, Yankees..." value={form.interests} onChange={(e) => setField("interests", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Personality / Style</Label>
                <Input placeholder="Prefers email, very direct..." value={form.personality_notes} onChange={(e) => setField("personality_notes", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>
              {editingContact && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? "Saving..." : editingContact ? "Save Changes" : "Add Contact"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
