-- ============================================================
-- DS-CRM Phase 3 Schema — Companies, Projects, Opportunities
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS)
-- ============================================================

-- ------------------------------------------------------------
-- COMPANIES
-- ------------------------------------------------------------
create table if not exists companies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  type            text not null default 'other',
  -- type: developer | architect_firm | law_firm | lender | brokerage | agency | expediter | consultant | other
  borough         text,
  address         text,
  website         text,
  phone           text,
  email           text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger if not exists companies_updated_at
  before update on companies
  for each row execute procedure update_updated_at_column();

create index if not exists idx_companies_type on companies(type);
create index if not exists idx_companies_name  on companies(name);

-- ------------------------------------------------------------
-- PROJECTS / SITES  (central object for land use practice)
-- ------------------------------------------------------------
create table if not exists projects (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  address          text,
  borough          text,
  -- borough: Manhattan | Brooklyn | Queens | Bronx | Staten Island
  block            text,
  lot              text,
  zoning_district  text,
  status           text not null default 'active',
  -- status: active | prospect | on_hold | closed
  description      text,
  developer_id     uuid references contacts(id)  on delete set null,
  company_id       uuid references companies(id) on delete set null,
  zoning_programs  text[] not null default '{}',
  -- e.g. ['MIH','485-x','UAP','Article XI','421-a','FRESH','PFASH']
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger if not exists projects_updated_at
  before update on projects
  for each row execute procedure update_updated_at_column();

create index if not exists idx_projects_status    on projects(status);
create index if not exists idx_projects_borough   on projects(borough);
create index if not exists idx_projects_developer on projects(developer_id);
create index if not exists idx_projects_company   on projects(company_id);

-- ------------------------------------------------------------
-- OPPORTUNITIES / PIPELINE
-- ------------------------------------------------------------
create table if not exists opportunities (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  contact_id          uuid references contacts(id)     on delete set null,
  company_id          uuid references companies(id)    on delete set null,
  project_id          uuid references projects(id)     on delete set null,
  stage               text not null default 'lead',
  -- stage: lead | discussion | consult | conflict_check | proposal | follow_up | retained | deferred | lost
  estimated_value     numeric(12,2),
  work_type           text,
  -- work_type: rezoning | MIH | UAP | 485x | tax_exemption | transaction | litigation | licensing | affordable_housing | other
  origin_source       text,
  -- origin_source: referral | linkedin | podcast | seminar | conference | article | existing_client | cold_outreach | other
  referral_contact_id uuid references contacts(id)     on delete set null,
  next_step           text,
  next_followup       date,
  notes               text,
  converted_matter_id uuid references matters(id)      on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger if not exists opportunities_updated_at
  before update on opportunities
  for each row execute procedure update_updated_at_column();

create index if not exists idx_opportunities_stage   on opportunities(stage);
create index if not exists idx_opportunities_contact on opportunities(contact_id);
create index if not exists idx_opportunities_company on opportunities(company_id);
create index if not exists idx_opportunities_project on opportunities(project_id);

-- ------------------------------------------------------------
-- ADDITIVE COLUMNS — contacts
-- ------------------------------------------------------------
alter table contacts add column if not exists company_id           uuid references companies(id) on delete set null;
alter table contacts add column if not exists last_interaction_date date;
alter table contacts add column if not exists next_followup_date    date;
alter table contacts add column if not exists relationship_strength text default 'unknown';
-- relationship_strength: strong | good | weak | dormant | unknown
alter table contacts add column if not exists tags                  text[] not null default '{}';

create index if not exists idx_contacts_company          on contacts(company_id);
create index if not exists idx_contacts_next_followup    on contacts(next_followup_date);
create index if not exists idx_contacts_last_interaction on contacts(last_interaction_date);

-- ------------------------------------------------------------
-- ADDITIVE COLUMNS — matters
-- ------------------------------------------------------------
alter table matters add column if not exists project_id           uuid references projects(id) on delete set null;
alter table matters add column if not exists responsible_attorney text;
alter table matters add column if not exists next_followup        date;

create index if not exists idx_matters_project on matters(project_id);

-- ------------------------------------------------------------
-- ADDITIVE COLUMNS — activities
-- ------------------------------------------------------------
alter table activities add column if not exists project_id        uuid references projects(id)      on delete set null;
alter table activities add column if not exists opportunity_id    uuid references opportunities(id) on delete set null;
alter table activities add column if not exists company_id        uuid references companies(id)     on delete set null;
alter table activities add column if not exists follow_up_required boolean not null default false;
alter table activities add column if not exists follow_up_date    date;

create index if not exists idx_activities_project     on activities(project_id);
create index if not exists idx_activities_opportunity on activities(opportunity_id);
