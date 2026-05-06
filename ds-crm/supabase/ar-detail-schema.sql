-- DS-CRM: AR Detail schema additions
-- Run in Supabase → SQL Editor AFTER collections-schema.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Add AP/AR contact fields to ar_items
-- ─────────────────────────────────────────────────────────────────────────────
alter table ar_items add column if not exists contact_id       uuid references contacts(id) on delete set null;
alter table ar_items add column if not exists ar_contact_name  text;
alter table ar_items add column if not exists ar_contact_email text;
alter table ar_items add column if not exists ar_contact_phone text;

create index if not exists idx_ar_items_contact on ar_items(contact_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Individual invoice lines (from Tabs3 A/R Detail / Client Ledger report)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists ar_invoices (
  id               uuid primary key default uuid_generate_v4(),
  ar_item_id       uuid not null references ar_items(id) on delete cascade,
  invoice_date     date,
  fees_billed      numeric(12,2) not null default 0,
  expenses_billed  numeric(12,2) not null default 0,
  advances_billed  numeric(12,2) not null default 0,
  fin_chg_billed   numeric(12,2) not null default 0,
  total_billed     numeric(12,2) not null default 0,
  fees_due         numeric(12,2) not null default 0,
  expenses_due     numeric(12,2) not null default 0,
  advances_due     numeric(12,2) not null default 0,
  fin_chg_due      numeric(12,2) not null default 0,
  total_due        numeric(12,2) not null default 0,
  ref_number       text,
  stmt_number      text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_ar_invoices_item on ar_invoices(ar_item_id);
create index if not exists idx_ar_invoices_date on ar_invoices(invoice_date desc);
