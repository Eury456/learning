"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, CheckCircle, Circle, AlertCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/types";

const priorityVariant: Record<TaskPriority, "destructive" | "warning" | "info" | "secondary"> = {
  urgent: "destructive",
  high: "warning",
  medium: "info",
  low: "secondary",
};

const MOCK_TASKS: Task[] = [
  { id: "1", contact_id: "1", matter_id: "2", title: "Submit supplemental documentation to HPD", description: "Income targeting breakdown + architect certification", due_date: "2026-05-06", status: "pending", priority: "urgent", recurring: false, recurrence_pattern: null, created_at: "", updated_at: "" },
  { id: "2", contact_id: "2", matter_id: "3", title: "Send invoice to Meridian Capital", description: null, due_date: "2026-05-06", status: "pending", priority: "high", recurring: false, recurrence_pattern: null, created_at: "", updated_at: "" },
  { id: "3", contact_id: null, matter_id: "4", title: "Prepare for OATH hearing — Park Slope matter", description: "Draft opening statement and exhibit list", due_date: "2026-05-07", status: "in_progress", priority: "high", recurring: false, recurrence_pattern: null, created_at: "", updated_at: "" },
  { id: "4", contact_id: "3", matter_id: null, title: "Follow up on outstanding retainer — David Park", description: null, due_date: "2026-05-08", status: "pending", priority: "medium", recurring: false, recurrence_pattern: null, created_at: "", updated_at: "" },
  { id: "5", contact_id: "6", matter_id: null, title: "Send birthday note to Carol Rosenthal", description: "Birthday May 10 — handwritten card preferred", due_date: "2026-05-09", status: "pending", priority: "low", recurring: true, recurrence_pattern: "yearly", created_at: "", updated_at: "" },
  { id: "6", contact_id: "5", matter_id: "1", title: "Circulate community board presentation draft", description: "Send to client for review before CB6 meeting", due_date: "2026-05-04", status: "overdue", priority: "high", recurring: false, recurrence_pattern: null, created_at: "", updated_at: "" },
  { id: "7", contact_id: null, matter_id: null, title: "Review Q2 AR aging report", description: "Flag all 60+ day items and initiate collections calls", due_date: "2026-05-03", status: "overdue", priority: "urgent", recurring: true, recurrence_pattern: "quarterly", created_at: "", updated_at: "" },
  { id: "8", contact_id: "4", matter_id: null, title: "Submit podcast guest pitch — Rachel Kim", description: "Target: Real Estate Weekly podcast", due_date: "2026-05-15", status: "pending", priority: "medium", recurring: false, recurrence_pattern: null, created_at: "", updated_at: "" },
  { id: "9", contact_id: "2", matter_id: null, title: "Monthly relationship check-in — Sandra Chow", description: null, due_date: "2026-05-20", status: "pending", priority: "medium", recurring: true, recurrence_pattern: "monthly", created_at: "", updated_at: "" },
  { id: "10", contact_id: "1", matter_id: "1", title: "Draft community benefit agreement summary", description: null, due_date: "2026-05-12", status: "completed", priority: "high", recurring: false, recurrence_pattern: null, created_at: "", updated_at: "" },
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
  "4": "Park Slope Landmark Challenge",
};

const statusGroups: Array<{ label: string; statuses: TaskStatus[]; icon: React.ElementType; iconClass: string }> = [
  { label: "Overdue", statuses: ["overdue"], icon: AlertCircle, iconClass: "text-red-500" },
  { label: "In Progress", statuses: ["in_progress"], icon: Clock, iconClass: "text-blue-500" },
  { label: "Due Soon", statuses: ["pending"], icon: Circle, iconClass: "text-slate-400" },
  { label: "Completed", statuses: ["completed"], icon: CheckCircle, iconClass: "text-green-500" },
];

export default function TasksPage() {
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(MOCK_TASKS.filter((t) => t.status === "completed").map((t) => t.id))
  );

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const effectiveStatus = (task: Task): TaskStatus =>
    completedIds.has(task.id) ? "completed" : task.status;

  const filters: Array<"all" | TaskStatus> = ["all", "overdue", "in_progress", "pending", "completed"];

  const getFilteredTasks = (statuses: TaskStatus[]) =>
    MOCK_TASKS.filter((t) =>
      (filter === "all" || statuses.includes(filter as TaskStatus)) &&
      statuses.includes(effectiveStatus(t))
    );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Tasks"
        subtitle={`${MOCK_TASKS.filter((t) => effectiveStatus(t) !== "completed").length} open tasks`}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map((f) => (
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
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>

        {/* Task Groups */}
        <div className="space-y-6">
          {statusGroups.map(({ label, statuses, icon: Icon, iconClass }) => {
            const tasks = getFilteredTasks(statuses);
            if (tasks.length === 0) return null;
            return (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                  <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
                  <span className="text-xs text-slate-400">({tasks.length})</span>
                </div>
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const done = completedIds.has(task.id);
                    return (
                      <Card key={task.id} className={done ? "opacity-60" : ""}>
                        <div className="flex items-start gap-3 p-4">
                          <button
                            onClick={() => toggleComplete(task.id)}
                            className="mt-0.5 shrink-0 transition-colors"
                          >
                            {done ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${done ? "line-through text-slate-400" : "text-slate-900"}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant={priorityVariant[task.priority]} className="text-[10px] capitalize">
                                  {task.priority}
                                </Badge>
                                {task.recurring && (
                                  <span className="text-[10px] text-slate-400 capitalize">{task.recurrence_pattern}</span>
                                )}
                              </div>
                            </div>
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {task.contact_id && CONTACT_NAMES[task.contact_id] && (
                                <span className="text-xs text-slate-500">{CONTACT_NAMES[task.contact_id]}</span>
                              )}
                              {task.matter_id && MATTER_TITLES[task.matter_id] && (
                                <>
                                  {task.contact_id && <span className="text-xs text-slate-300">·</span>}
                                  <span className="text-xs text-slate-500 italic">{MATTER_TITLES[task.matter_id]}</span>
                                </>
                              )}
                              {task.due_date && (
                                <>
                                  <span className="text-xs text-slate-300">·</span>
                                  <span className={`text-xs font-medium ${
                                    effectiveStatus(task) === "overdue" ? "text-red-600" : "text-slate-500"
                                  }`}>
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
      </div>
    </div>
  );
}
