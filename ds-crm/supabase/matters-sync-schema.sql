-- Run in Supabase → SQL Editor

-- Add matter_number to matters table
alter table matters add column if not exists matter_number text;
create index if not exists matters_matter_number on matters(matter_number);

-- Add matter_id link to projects so synced projects track their source matter
alter table projects add column if not exists matter_id uuid references matters(id) on delete set null;
create index if not exists projects_matter_id on projects(matter_id);
