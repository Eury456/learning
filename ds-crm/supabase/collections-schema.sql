-- DS-CRM: AR & Collections Schema Addition
-- Run this in Supabase → SQL Editor (after schema.sql)

-- ─────────────────────────────────────────────
-- AR ITEMS (from Tabs3 aging report)
-- ─────────────────────────────────────────────
create table ar_items (
  id                uuid primary key default uuid_generate_v4(),
  matter_number     text,
  client_name       text not null,
  matter_description text,
  days_0_27         numeric(12,2) not null default 0,
  days_28_60        numeric(12,2) not null default 0,
  days_61_90        numeric(12,2) not null default 0,
  days_91_120       numeric(12,2) not null default 0,
  days_121_180      numeric(12,2) not null default 0,
  days_181_plus     numeric(12,2) not null default 0,
  balance_due       numeric(12,2) not null default 0,
  report_date       date not null default current_date,
  status            text not null default 'open'
                    check (status in ('open','promised','partial','disputed','paid','written_off')),
  promise_date      date,
  promise_amount    numeric(12,2),
  next_followup     date,
  assigned_to       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- COLLECTION NOTES (per AR item)
-- ─────────────────────────────────────────────
create table collection_notes (
  id              uuid primary key default uuid_generate_v4(),
  ar_item_id      uuid not null references ar_items(id) on delete cascade,
  type            text not null default 'note'
                  check (type in ('call','email','meeting','note','promise','payment','document')),
  subject         text not null,
  notes           text,
  contact_name    text,
  amount          numeric(12,2),
  follow_up_date  date,
  document_url    text,
  activity_date   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Auto-update trigger
create trigger ar_items_updated_at before update on ar_items
  for each row execute function update_updated_at();

-- Indexes
create index on ar_items(status);
create index on ar_items(next_followup);
create index on ar_items(balance_due desc);
create index on collection_notes(ar_item_id);
create index on collection_notes(activity_date desc);
