"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Briefcase,
  DollarSign,
  AlertTriangle,
  CheckSquare,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ActivityType } from "@/types";

interface DashboardData {
  stats: {
    activeMatters: number;
    pipeline: number;
    outstandingAR: number;
    overdueAR: number;
    tasksOverdue: number;
    tasksDueToday: number;
    contacts: number;
    activitiesMTD: number;
  };
  recentActivities: Array<{
    id: string;
    type: ActivityType;
    subject: string;
    activity_date: string;
    contact?: { name: string };
    matter?: { title: string };
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    priority: string;
    due_date: string | null;
    contact?: { name: string };
  }>;
}

const activityTypeVariant: Record<ActivityType, "default" | "success" | "info" | "purple" | "warning" | "secondary"> = {
  call: "success",
  meeting: "info",
  email: "default",
  event: "purple",
  follow_up: "warning",
  internal: "secondary",
  other: "secondary",
};

const priorityVariant: Record<string, "destructive" | "warning" | "info" | "secondary"> = {
  urgent: "destructive",
  high: "warning",
  medium: "info",
  low: "secondary",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = data?.stats;

  const statCards = [
    { label: "Active Matters", value: loading ? "—" : String(stats?.activeMatters ?? 0), icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Pipeline", value: loading ? "—" : formatCurrency(stats?.pipeline ?? 0), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Outstanding AR", value: loading ? "—" : formatCurrency(stats?.outstandingAR ?? 0), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "90+ Day AR", value: loading ? "—" : formatCurrency(stats?.overdueAR ?? 0), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Tasks Due Today", value: loading ? "—" : String(stats?.tasksDueToday ?? 0), icon: CheckSquare, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Overdue Tasks", value: loading ? "—" : String(stats?.tasksOverdue ?? 0), icon: Clock, color: "text-red-600", bg: "bg-red-50" },
    { label: "Total Contacts", value: loading ? "—" : String(stats?.contacts ?? 0), icon: Users, color: "text-slate-600", bg: "bg-slate-50" },
    { label: "Activities (MTD)", value: loading ? "—" : String(stats?.activitiesMTD ?? 0), icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Dashboard"
        subtitle="Welcome back — here's your practice at a glance"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
              )}
              {!loading && (!data?.recentActivities || data.recentActivities.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No activities logged yet.</p>
              )}
              <div className="space-y-3">
                {data?.recentActivities.map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Badge variant={activityTypeVariant[item.type] ?? "secondary"} className="mt-0.5 shrink-0 capitalize">
                      {item.type.replace("_", " ")}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.subject}</p>
                      <p className="text-xs text-slate-500">
                        {item.contact?.name ?? "—"} · {formatDate(item.activity_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
              )}
              {!loading && (!data?.upcomingTasks || data.upcomingTasks.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No upcoming tasks.</p>
              )}
              <div className="space-y-3">
                {data?.upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3">
                    <Badge variant={priorityVariant[task.priority] ?? "secondary"} className="mt-0.5 shrink-0 capitalize">
                      {task.priority}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-500">
                        {task.contact?.name ?? ""}{task.contact?.name && task.due_date ? " · " : ""}
                        {task.due_date ? `Due ${formatDate(task.due_date)}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
