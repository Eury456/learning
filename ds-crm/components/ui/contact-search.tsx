"use client";
import { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Button } from "./button";
import { UserPlus } from "lucide-react";
import type { ContactType } from "@/types";

interface ContactResult {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
}

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "client",         label: "Client" },
  { value: "prospect",       label: "Prospect" },
  { value: "developer",      label: "Developer" },
  { value: "referral_source",label: "Referral Source" },
  { value: "architect",      label: "Architect" },
  { value: "broker",         label: "Broker" },
  { value: "lender",         label: "Lender" },
  { value: "consultant",     label: "Consultant" },
  { value: "government",     label: "Government" },
  { value: "other",          label: "Other" },
];

interface Props {
  value: string;
  displayName: string;
  onSelect: (id: string, name: string) => void;
  placeholder?: string;
}

export function ContactSearch({ value, displayName, onSelect, placeholder }: Props) {
  const [search, setSearch] = useState(displayName);
  const [results, setResults] = useState<ContactResult[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "", email: "", phone: "", type: "other" as ContactType, company: "",
  });
  const [createError, setCreateError] = useState("");
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const startCreating = () => {
    setNewContact({ name: search, email: "", phone: "", type: "other", company: "" });
    setCreateError("");
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!newContact.name.trim()) { setCreateError("Name is required."); return; }
    setSaving(true);
    setCreateError("");
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newContact.name.trim(),
        email: newContact.email.trim() || null,
        phone: newContact.phone.trim() || null,
        type: newContact.type,
        company: newContact.company.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setCreateError(data.error); return; }
    onSelect(data.id, data.name);
    setSearch(data.name);
    setOpen(false);
    setCreating(false);
  };

  return (
    <div ref={ref} className="relative">
      <Input
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setCreating(false);
          if (!e.target.value) onSelect("", "");
        }}
        placeholder={placeholder ?? "Search contacts..."}
      />
      {value && (
        <p className="mt-0.5 text-xs text-green-600">&#10003; {displayName}</p>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
          {!creating ? (
            <>
              <div className="max-h-44 overflow-y-auto">
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
                    <span className="font-medium text-slate-900">{c.name}</span>
                    {c.company && <span className="text-slate-400 text-xs ml-1">· {c.company}</span>}
                  </button>
                ))}
                {results.length === 0 && search.length >= 2 && (
                  <p className="px-3 py-2 text-xs text-slate-400">
                    No contacts found for &quot;{search}&quot;
                  </p>
                )}
              </div>
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 font-medium"
                  onMouseDown={e => { e.preventDefault(); startCreating(); }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Create &quot;{search}&quot; as new contact
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-indigo-500" />
                New Contact
              </p>
              <Input
                value={newContact.name}
                onChange={e => setNewContact(n => ({ ...n, name: e.target.value }))}
                placeholder="Full name *"
                className="text-xs h-8"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newContact.email}
                  onChange={e => setNewContact(n => ({ ...n, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  className="text-xs h-8"
                />
                <Input
                  value={newContact.phone}
                  onChange={e => setNewContact(n => ({ ...n, phone: e.target.value }))}
                  placeholder="Phone"
                  className="text-xs h-8"
                />
              </div>
              <Input
                value={newContact.company}
                onChange={e => setNewContact(n => ({ ...n, company: e.target.value }))}
                placeholder="Company / Organization"
                className="text-xs h-8"
              />
              <Select
                value={newContact.type}
                onValueChange={v => setNewContact(n => ({ ...n, type: v as ContactType }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onMouseDown={e => { e.preventDefault(); handleCreate(); }}
                  disabled={saving || !newContact.name.trim()}
                >
                  {saving ? "Creating..." : "Create & Select"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onMouseDown={e => { e.preventDefault(); setCreating(false); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
