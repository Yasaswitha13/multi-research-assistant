-- Run this in the Supabase SQL editor for your project.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  sub_questions jsonb not null,
  result text not null,
  -- Populated only when the 3-agent (web search) pipeline ran; [] otherwise.
  researcher_findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

-- Users can only see and create their own reports.
create policy "Users can view their own reports"
  on reports for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reports"
  on reports for insert
  with check (auth.uid() = user_id);

create index if not exists reports_user_id_created_at_idx
  on reports (user_id, created_at desc);
