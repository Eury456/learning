"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Users, Mail, Calendar, MessageSquare, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Activity, ActivityType } from "@/types";

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

const MOCK_ACTIVITIES: Activity[] = [
  { id: "1", contact_id: "1", matter_id: "1", type: "call", subject: "Rezoning update for 145 W 28th", notes: "Client wants to accelerate ULURP timeline. Discussed strategy for community board presentation. Will follow up with revised timeline.", activity_date: "2026-05-06T10:30:00", created_at: "" },
  { id: "2", contact_id: "2", matter_id: "3", type: "meeting", subject: "485-x eligibility discussion", notes: "Reviewed affordability requirements. Client confirmed 25% AMI units. Need HPD sign-off by June 1.", activity_date: "2026-05-06T09:00:00", created_at: "" },
  { id: "3", contact_id: "3", matter_id: null, type: "email", subject: "Retainer agreement follow-up", notes: "Sent revised retainer for new UAP matter. Awaiting countersignature.", activity_date: "2026-05-05T16:15:00", created_at: "" },
  { id: "4", contact_id: "4", matter_id: null, type: "event", subject: "REBNY cocktail reception", notes: "Met 8 new contacts. Key introductions: Thomas Mayer (developer, Bronx projects) and Lisa Chen (HPD deputy director).", activity_date: "2026-05-05T18:00:00", created_at: "" },
  { id: "5", contact_id: "5", matter_id: "2", type: "call", subject: "MIH application status", notes: "HPD reviewer requested additional documentation on income targeting. Submitted supplemental materials same day.", activity_date: "2026-05-05T14:00:00", created_at: "" },
  { id: "6", contact_id: "6", matter_id: null, type: "meeting", subject: "Quarterly relationship lunch", notes: "Discussed cross-referral opportunities. Carol handling a large portfolio sale that may need land use counsel.", activity_date: "2026-05-04T12:30:00", created_at: "" },
  { id: "7", contact_id: "1", matter_id: "2", type: "internal", subject: "Strategy session — Greenpoint MIH", notes: "Team meeting to align on HPD submission approach. Associate drafting Section 8 support letter.", activity_date: "2026-05-03T15:00:00", created_at: "" },
];

const CONTACT_NAMES: Record<string, string> = {
  "1": "Michael Torres",
  "2": "Sandra Chow",
  "3": "David Park",
  "4": "Rachel Kim",
  "5": "James Wu",
  "6": "Carol Rosenthal",
};

const MATTER_TITLES: Record<string, string> = {
  "1": "145 W 28th St Rezoning",
  "2": "Greenpoint Mixed-Income MIH",
  "3": "485-x Application — 520 Atlantic Ave",
};

export default function ActivitiesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");

  const types: Array<ActivityType | "all"> = ["all", "call", "meeting", "email", "event", "follow_up", "internal"];

  const filtered = MOCK_ACTIVITIES.filter((a) => {
    const matchesSearch = a.subject.toLowerCase().includes(search.toLowerCase()) ||
      (CONTACT_NAMES[a.contact_id ?? ""] ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Activity Log" subtitle={`${MOCK_ACTIVITIES.length} logged activities`} />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {types.map((t) => (
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
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Log Activity
            </Button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-4">
            {filtered.map((activity) => {
              const Icon = activityIcons[activity.type];
              const contactName = CONTACT_NAMES[activity.contact_id ?? ""];
              const matterTitle = MATTER_TITLES[activity.matter_id ?? ""];
              return (
                <div key={activity.id} className="relative flex gap-4 pl-2">
                  <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${
                    activity.type === "call" ? "bg-green-100" :
                    activity.type === "meeting" ? "bg-blue-100" :
                    activity.type === "email" ? "bg-slate-100" :
                    activity.type === "event" ? "bg-purple-100" :
                    activity.type === "follow_up" ? "bg-amber-100" :
                    "bg-slate-100"
                  }`}>
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
                            {contactName && (
                              <span className="text-xs text-slate-500">{contactName}</span>
                            )}
                            {matterTitle && (
                              <>
                                <span className="text-xs text-slate-300">·</span>
                                <span className="text-xs text-slate-500 italic">{matterTitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">
                          {formatDate(activity.activity_date)}
                        </span>
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
      </div>
    </div>
  );
}
