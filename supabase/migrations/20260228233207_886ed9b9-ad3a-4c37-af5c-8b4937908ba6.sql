
-- Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text not null,
  target_stack text not null,
  difficulty text not null,
  status text default 'planning',
  created_at timestamptz default now()
);

-- Modules table
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  order_index integer not null,
  title text not null,
  summary text not null,
  objectives text[] not null,
  deliverable text not null,
  estimated_hours integer not null,
  status text default 'not_started',
  git_repo_url text,
  starter_code_url text,
  interactive_hint text,
  created_at timestamptz default now()
);

-- Module resources table
create table public.module_resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules on delete cascade not null,
  label text not null,
  url text not null,
  type text not null
);

-- Module progress table
create table public.module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  module_id uuid references public.modules not null,
  status text default 'not_started',
  completed_at timestamptz,
  unique(user_id, module_id)
);

-- Enable Row Level Security
alter table public.projects enable row level security;
alter table public.modules enable row level security;
alter table public.module_resources enable row level security;
alter table public.module_progress enable row level security;

-- RLS policies
create policy "Users see own projects"
  on public.projects for all
  using (auth.uid() = user_id);

create policy "Users see modules of own projects"
  on public.modules for all
  using (project_id in (
    select id from public.projects
    where user_id = auth.uid()
  ));

create policy "Users see resources of own modules"
  on public.module_resources for all
  using (module_id in (
    select id from public.modules
    where project_id in (
      select id from public.projects
      where user_id = auth.uid()
    )
  ));

create policy "Users see own progress"
  on public.module_progress for all
  using (auth.uid() = user_id);
