-- Pre-Meeting Briefer: Optional Supabase PostgreSQL Schema & Row-Level Security
-- Run this SQL in your Supabase SQL Editor if you configure SUPABASE_URL and SUPABASE_ANON_KEY.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  default_role text not null default 'Meeting Lead',
  organization text not null default '',
  preferred_tone text not null default 'Executive Concise',
  avatar_url text not null default '',
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  date_time text not null,
  duration_minutes integer not null default 45,
  meeting_type text not null,
  participants jsonb not null default '[]'::jsonb,
  agenda text not null default '',
  objectives text not null default '',
  background_info text not null default '',
  previous_notes text not null default '',
  personalized_role text not null default 'Meeting Lead',
  status text not null default 'Draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  extracted_text text not null default '',
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content jsonb not null,
  personalized_role text not null default 'Meeting Lead',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.meetings enable row level security;
alter table public.uploaded_documents enable row level security;
alter table public.briefings enable row level security;

create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

create policy "Users can manage own meetings" on public.meetings for all using (auth.uid() = user_id);
create policy "Users can manage own documents" on public.uploaded_documents for all using (auth.uid() = user_id);
create policy "Users can manage own briefings" on public.briefings for all using (auth.uid() = user_id);
