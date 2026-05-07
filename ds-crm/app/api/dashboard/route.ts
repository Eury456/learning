import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    contactsResult,
    mattersResult,
    invoicesResult,
    tasksOverdueResult,
    tasksTodayResult,
    activitiesMTDResult,
    recentActivitiesResult,
    upcomingTasksResult,
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("matters").select("status, estimated_fees"),
    supabase.from("invoices").select("amount_billed, amount_collected, status"),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "overdue"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("due_date", today)
      .neq("status", "completed"),
    supabase
      .from("activities")
      .select("*", { count: "exact", head: true })
      .gte("activity_date", startOfMonth),
    supabase
      .from("activities")
      .select("id, type, subject, activity_date, contact:contacts(name), matter:matters(title)")
      .order("activity_date", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, contact:contacts(name)")
      .neq("status", "completed")
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matters: any[] = mattersResult.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: any[] = invoicesResult.data ?? [];

  const activeMatters = matters.filter((m) => m.status === "active").length;
  const pipeline = matters
    .filter((m) => m.status === "active" || m.status === "prospect")
    .reduce((sum: number, m) => sum + (m.estimated_fees ?? 0), 0);

  const outstandingInvoices = invoices.filter(
    (i) => i.status !== "paid" && i.status !== "written_off"
  );
  const outstandingAR = outstandingInvoices.reduce(
    (sum: number, i) => sum + (i.amount_billed - i.amount_collected),
    0
  );
  const overdueAR = invoices
    .filter((i) => i.status === "90+")
    .reduce((sum: number, i) => sum + i.amount_billed, 0);

  return Response.json({
    stats: {
      activeMatters,
      pipeline,
      outstandingAR,
      overdueAR,
      tasksOverdue: tasksOverdueResult.count ?? 0,
      tasksDueToday: tasksTodayResult.count ?? 0,
      contacts: contactsResult.count ?? 0,
      activitiesMTD: activitiesMTDResult.count ?? 0,
    },
    recentActivities: recentActivitiesResult.data ?? [],
    upcomingTasks: upcomingTasksResult.data ?? [],
  });
}
