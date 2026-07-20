-- Supabase SQL Schema for SINTER PAMONG
-- Jalankan kode ini di Supabase Dashboard -> SQL Editor

-- 1. Create Profiles Table (extends Supabase Auth)
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text not null,
  role text not null check (role in ('admin', 'staff')),
  position text,
  job_roles text[] default array[]::text[],
  is_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Attendance Table
CREATE TABLE public.attendance_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  status text not null check (status in ('present', 'leave', 'sick', 'absent')),
  note text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create KPI Evaluations Table
CREATE TABLE public.kpi_evaluations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  evaluator_id uuid references public.profiles(id) on delete cascade not null,
  month text not null, -- Format YYYY-MM
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create KPI Scores Table
CREATE TABLE public.kpi_scores (
  id uuid default gen_random_uuid() primary key,
  kpi_id uuid references public.kpi_evaluations(id) on delete cascade not null,
  task text not null,
  score integer not null check (score >= 1 and score <= 5)
);

-- 5. Create Task Reports Table
CREATE TABLE public.task_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  task_name text not null,
  description text not null,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create School Settings Table
CREATE TABLE public.school_settings (
  id integer primary key default 1 check (id = 1), -- Ensure only one row exists
  latitude double precision not null,
  longitude double precision not null,
  max_radius integer not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert Default Settings
INSERT INTO public.school_settings (latitude, longitude, max_radius) 
VALUES (-6.175110, 106.827153, 100)
ON CONFLICT (id) DO NOTHING;

-- Disable RLS temporarily to ensure smooth development transitions (You can enable and secure this later)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings DISABLE ROW LEVEL SECURITY;
