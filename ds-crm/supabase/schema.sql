-- DS-CRM: Supabase Database Schema
-- Run this in Supabase → SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────
create table contacts (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  company         text,
  title           text,
  type            text not null default 'other'
                  check (type in ('client','prospect','referral_source','developer',
                                  'architect','broker','lender','consultant','government','other')),
  email           text,
  phone           text,
  linkedin        text,
  referral_source_id uuid references contacts(id) on delete set null,
  birthday        date,
  family_notes    text,
  interests       text,
  personality_notes text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- MATTERS
-- ─────────────────────────────────────────────
create table matters (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  client_id       uuid not null references contacts(id) on delete restrict,
  type            text not null default 'other'
                  check (type in ('rezoning','MIH','UAP','485x','tax_exemption',
                                  'transaction','litigation','licensing','affordable_housing','other')),
  status          text not null default 'active'
                  check (status in ('prospect','active','on_hold','closed')),
  stage           text,
  description     text,
  estimated_fees  numeric(12,2),
  fees_billed     numeric(12,2) default 0,
  fees_collected  numeric(12,2) default 0,
  opened_date     date,
  closed_date     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- ACTIVITIES
-- ─────────────────────────────────────────────
create table activities (
  id              uuid primary key default uuid_generate_v4(),
  contact_id      uuid references contacts(id) on delete set null,
  matter_id       uuid references matters(id) on delete set null,
  type            text not null default 'other'
                  check (type in ('call','meeting','email','event','follow_up','internal','other')),
  subject         text not null,
  notes           text,
  activity_date   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
create table tasks (
  id                  uuid primary key default uuid_generate_v4(),
  contact_id          uuid references contacts(id) on delete set null,
  matter_id           uuid references matters(id) on delete set null,
  title               text not null,
  description         text,
  due_date            date,
  status              text not null default 'pending'
                      check (status in ('pending','in_progress','completed','overdue')),
  priority            text not null default 'medium'
                      check (priority in ('low','medium','high','urgent')),
  recurring           boolean not null default false,
  recurrence_pattern  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────────
create table invoices (
  id               uuid primary key default uuid_generate_v4(),
  matter_id        uuid not null references matters(id) on delete restrict,
  invoice_number   text,
  amount_billed    numeric(12,2) not null default 0,
  amount_collected numeric(12,2) not null default 0,
  invoice_date     date not null default current_date,
  due_date         date not null,
  status           text not null default 'current'
                   check (status in ('current','30+','60+','90+','paid','written_off')),
  notes            text,
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at before update on contacts
  for each row execute function update_updated_at();

create trigger matters_updated_at before update on matters
  for each row execute function update_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index on contacts(type);
create index on contacts(referral_source_id);
create index on matters(client_id);
create index on matters(status);
create index on activities(contact_id);
create index on activities(matter_id);
create index on activities(activity_date desc);
create index on tasks(status);
create index on tasks(due_date);
create index on tasks(contact_id);
create index on invoices(matter_id);
create index on invoices(status);
create index on invoices(due_date);

-- ─────────────────────────────────────────────
-- ROW-LEVEL SECURITY (enable after auth setup)
-- ─────────────────────────────────────────────
-- alter table contacts enable row level security;
-- alter table matters enable row level security;
-- alter table activities enable row level security;
-- alter table tasks enable row level security;
-- alter table invoices enable row level security;

-- Example policy (uncomment when auth is configured):
-- create policy "authenticated users only" on contacts
--   for all using (auth.role() = 'authenticated');
