"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Phone, Mail, Building2 } from "lucide-react";
import { initials } from "@/lib/utils";
import type { Contact, ContactType } from "@/types";

const MOCK_CONTACTS: Contact[] = [
  { id: "1", name: "Michael Torres", company: "Greenpoint Development LLC", title: "Principal", type: "developer", email: "mtorres@gpdev.com", phone: "212-555-0101", linkedin: null, referral_source_id: null, birthday: "1975-03-15", family_notes: "Wife - Sarah, 2 kids", interests: "Golf, Yankees", personality_notes: "Very detail-oriented, prefers email", notes: "Long-standing client. Referred 3 new matters.", created_at: "", updated_at: "" },
  { id: "2", name: "Sandra Chow", company: "Meridian Capital Group", title: "Managing Director", type: "lender", email: "schow@meridiancap.com", phone: "212-555-0202", linkedin: null, referral_source_id: null, birthday: "1980-07-22", family_notes: null, interests: "Architecture, Travel", personality_notes: "Direct communicator, respond quickly", notes: "Key lender relationship. Handles construction financing.", created_at: "", updated_at: "" },
  { id: "3", name: "David Park", company: "Park Architecture Studio", title: "Principal Architect", type: "architect", email: "dpark@parkarch.com", phone: "212-555-0303", linkedin: null, referral_source_id: null, birthday: null, family_notes: null, interests: null, personality_notes: null, notes: "Referral source for multiple affordable housing projects.", created_at: "", updated_at: "" },
  { id: "4", name: "Rachel Kim", company: "REBNY", title: "Senior VP", type: "other", email: "rkim@rebny.com", phone: "212-555-0404", linkedin: null, referral_source_id: null, birthday: "1978-11-05", family_notes: null, interests: "Policy, Networking", personality_notes: null, notes: "Strong industry connector. Invites to events.", created_at: "", updated_at: "" },
  { id: "5", name: "James Wu", company: "Wu Properties LLC", title: "CEO", type: "client", email: "jwu@wuproperties.com", phone: "212-555-0505", linkedin: null, referral_source_id: null, birthday: null, family_notes: null, interests: null, personality_notes: null, notes: "Active MIH matter. Potential rezoning pipeline.", created_at: "", updated_at: "" },
  { id: "6", name: "Carol Rosenthal", company: "Herrick Feinstein LLP", title: "Partner", type: "referral_source", email: "crosenthal@herrick.com", phone: "212-555-0606", linkedin: null, referral_source_id: null, birthday: "1968-05-10", family_notes: "Husband - Robert", interests: "Opera, Philanthropy", personality_notes: "Very well-connected, excellent referral source", notes: "Referred 2 major transactions this year.", created_at: "", updated_at: "" },
];

const typeVariant: Record<ContactType, "default" | "success" | "info" | "warning" | "purple" | "secondary"> = {
  client: "success",
  prospect: "warning",
  referral_source: "purple",
  developer: "info",
  architect: "info",
  broker: "info",
  lender: "default",
  consultant: "secondary",
  government: "secondary",
  other: "secondary",
};

const typeLabel: Record<ContactType, string> = {
  client: "Client",
  prospect: "Prospect",
  referral_source: "Referral Source",
  developer: "Developer",
  architect: "Architect",
  broker: "Broker",
  lender: "Lender",
  consultant: "Consultant",
  government: "Government",
  other: "Other",
};

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactType | "all">("all");

  const filtered = MOCK_CONTACTS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || c.type === filter;
    return matchesSearch && matchesFilter;
  });

  const filterTypes: Array<ContactType | "all"> = ["all", "client", "prospect", "referral_source", "developer", "lender", "architect"];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Contacts" subtitle={`${MOCK_CONTACTS.length} contacts`} />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {filterTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === t
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "all" ? "All" : typeLabel[t]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search contacts..."
                className="w-56 pl-8 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Contact Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((contact) => (
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
                      <Badge variant={typeVariant[contact.type]} className="shrink-0 text-[10px]">
                        {typeLabel[contact.type]}
                      </Badge>
                    </div>
                    {contact.title && (
                      <p className="text-xs text-slate-600 truncate">{contact.title}</p>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <p className="text-xs text-slate-500 truncate">{contact.company}</p>
                      </div>
                    )}
                  </div>
                </div>

                {contact.notes && (
                  <p className="mt-3 text-xs text-slate-500 line-clamp-2 border-t border-slate-100 pt-2">
                    {contact.notes}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-3">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && !contact.email && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
