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
import { formatCurrency } from "@/lib/utils";

const stats = [
  { label: "Active Matters", value: "24", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Total Pipeline", value: formatCurrency(1850000), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  { label: "Outstanding AR", value: formatCurrency(342000), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "90+ Day AR", value: formatCurrency(48000), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  { label: "Tasks Due Today", value: "7", icon: CheckSquare, color: "text-purple-600", bg: "bg-purple-50" },
  { label: "Overdue Tasks", value: "3", icon: Clock, color: "text-red-600", bg: "bg-red-50" },
  { label: "Total Contacts", value: "189", icon: Users, color: "text-slate-600", bg: "bg-slate-50" },
  { label: "Activities (MTD)", value: "42", icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
];

const recentActivities = [
  { contact: "Michael Torres", type: "Call", subject: "Rezoning update for 145 W 28th", date: "Today, 10:30 AM" },
  { contact: "Sandra Chow", type: "Meeting", subject: "485-x eligibility discussion", date: "Today, 9:00 AM" },
  { contact: "David Park", type: "Email", subject: "Retainer agreement follow-up", date: "Yesterday, 4:15 PM" },
  { contact: "Rachel Kim", type: "Event", subject: "REBNY cocktail reception", date: "Yesterday, 6:00 PM" },
  { contact: "James Wu", type: "Call", subject: "MIH application status", date: "May 5, 2:00 PM" },
];

const upcomingTasks = [
  { title: "Follow up with Greenpoint Dev on HPD submission", contact: "Greenpoint Dev LLC", priority: "urgent", due: "Today" },
  { title: "Send invoice to Meridian Capital", contact: "Meridian Capital", priority: "high", due: "Today" },
  { title: "Prep for City Planning hearing", contact: "N/A", priority: "high", due: "Tomorrow" },
  { title: "Check 60-day AR — SL Green", contact: "SL Green Realty", priority: "medium", due: "May 8" },
  { title: "Birthday note — Carol Rosenthal", contact: "Carol Rosenthal", priority: "low", due: "May 10" },
];

const priorityVariant: Record<string, "destructive" | "warning" | "info" | "secondary"> = {
  urgent: "destructive",
  high: "warning",
  medium: "info",
  low: "secondary",
};

const activityTypeVariant: Record<string, "default" | "success" | "info" | "purple" | "warning"> = {
  Call: "success",
  Meeting: "info",
  Email: "default",
  Event: "purple",
  "Follow Up": "warning",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Dashboard"
        subtitle="Welcome back — here's your practice at a glance"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
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
            <CardContent className="space-y-3">
              {recentActivities.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Badge variant={activityTypeVariant[item.type] ?? "secondary"} className="mt-0.5 shrink-0">
                    {item.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.subject}</p>
                    <p className="text-xs text-slate-500">{item.contact} · {item.date}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingTasks.map((task, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Badge variant={priorityVariant[task.priority]} className="mt-0.5 shrink-0 capitalize">
                    {task.priority}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.contact} · Due {task.due}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
