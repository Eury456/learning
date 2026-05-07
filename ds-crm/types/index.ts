export type ContactType =
  | "client"
  | "prospect"
  | "referral_source"
  | "developer"
  | "architect"
  | "broker"
  | "lender"
  | "consultant"
  | "government"
  | "other";

export type MatterType =
  | "rezoning"
  | "MIH"
  | "UAP"
  | "485x"
  | "tax_exemption"
  | "transaction"
  | "litigation"
  | "licensing"
  | "affordable_housing"
  | "other";

export type MatterStatus = "prospect" | "active" | "closed" | "on_hold";

export type ActivityType =
  | "call"
  | "meeting"
  | "email"
  | "event"
  | "follow_up"
  | "internal"
  | "other";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type InvoiceStatus = "current" | "30+" | "60+" | "90+" | "written_off" | "paid";

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  type: ContactType;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  referral_source_id: string | null;
  referral_source?: Contact;
  birthday: string | null;
  family_notes: string | null;
  interests: string | null;
  personality_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Matter {
  id: string;
  matter_number: string | null;
  title: string;
  client_id: string;
  client?: Contact;
  type: MatterType;
  status: MatterStatus;
  stage: string | null;
  description: string | null;
  estimated_fees: number | null;
  fees_billed: number | null;
  fees_collected: number | null;
  opened_date: string | null;
  closed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  contact_id: string | null;
  contact?: Contact;
  matter_id: string | null;
  matter?: Matter;
  type: ActivityType;
  subject: string;
  notes: string | null;
  activity_date: string;
  created_at: string;
}

export interface Task {
  id: string;
  contact_id: string | null;
  contact?: Contact;
  matter_id: string | null;
  matter?: Matter;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  recurring: boolean;
  recurrence_pattern: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  matter_id: string;
  matter?: Matter;
  invoice_number: string | null;
  amount_billed: number;
  amount_collected: number;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
}

export interface DashboardStats {
  activeMatters: number;
  totalPipeline: number;
  outstandingAR: number;
  overdueAR: number;
  tasksOverdue: number;
  tasksDueToday: number;
  contactsCount: number;
  activitiesThisMonth: number;
}
