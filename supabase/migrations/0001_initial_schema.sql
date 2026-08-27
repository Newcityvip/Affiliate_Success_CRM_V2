create extension if not exists pgcrypto;

create type app_role as enum ('staff','supervisor','admin','super_admin');
create type affiliate_state as enum (
  'unassigned','assigned','contact_pending','contacting','callback',
  'telegram_onboarding','telegram_connected','managed','at_risk',
  'dormant','reactivation','closed'
);
create type work_status as enum ('pending','in_progress','completed','cancelled','overdue');
create type work_type as enum ('call','callback','telegram_checkin','at_risk','reactivation','growth','followup','issue');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role app_role not null default 'staff',
  team text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table affiliates (
  id uuid primary key default gen_random_uuid(),
  affiliate_username text not null unique,
  email text,
  phone text,
  brand_id uuid references brands(id),
  state affiliate_state not null default 'unassigned',
  preferred_channel text,
  telegram_connected_at timestamptz,
  last_meaningful_contact_at timestamptz,
  closed_reason text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table affiliate_assignments (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id),
  staff_id uuid not null references profiles(id),
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  is_active boolean not null default true
);
create unique index one_active_assignment_per_affiliate on affiliate_assignments(affiliate_id) where is_active;
create index assignments_staff_active_idx on affiliate_assignments(staff_id, is_active);

create table contact_attempts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id),
  assignment_id uuid references affiliate_assignments(id),
  staff_id uuid not null references profiles(id),
  channel text not null check (channel in ('phone','telegram','whatsapp','other')),
  outcome text not null,
  notes text,
  attempted_at timestamptz not null default now(),
  next_attempt_at timestamptz
);
create index contact_attempts_affiliate_idx on contact_attempts(affiliate_id, attempted_at desc);

create table work_items (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id),
  staff_id uuid not null references profiles(id),
  type work_type not null,
  status work_status not null default 'pending',
  priority_score integer not null default 0,
  reason text not null,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  outcome text,
  created_at timestamptz not null default now()
);
create index work_staff_queue_idx on work_items(staff_id, status, priority_score desc, due_at);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id),
  staff_id uuid not null references profiles(id),
  channel text not null,
  interaction_type text not null,
  outcome text,
  notes text,
  meaningful boolean not null default true,
  occurred_at timestamptz not null default now()
);

create table affiliate_performance_monthly (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id),
  month date not null,
  ftd integer not null default 0,
  active_players integer not null default 0,
  deposit_amount numeric(18,2) not null default 0,
  ngr numeric(18,2) not null default 0,
  commission numeric(18,2) not null default 0,
  unique (affiliate_id, month)
);

create table affiliate_scores (
  affiliate_id uuid primary key references affiliates(id),
  health_score integer not null default 50 check (health_score between 0 and 100),
  opportunity_score integer not null default 50 check (opportunity_score between 0 and 100),
  calculated_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table affiliates enable row level security;
alter table affiliate_assignments enable row level security;
alter table contact_attempts enable row level security;
alter table work_items enable row level security;
alter table interactions enable row level security;

-- Initial RLS foundation. Production policies should be expanded before launch.
create policy "staff can view own profile" on profiles for select using (id = auth.uid());
create policy "staff can view assigned work" on work_items for select using (staff_id = auth.uid());
create policy "staff can update assigned work" on work_items for update using (staff_id = auth.uid());
