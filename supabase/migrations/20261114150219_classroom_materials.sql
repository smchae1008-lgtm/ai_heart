insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('classroom-materials', 'classroom-materials', false, 4194304, array['application/pdf']);

create table public.classroom_materials (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  storage_path text not null unique,
  pages jsonb not null check (jsonb_typeof(pages) = 'array'),
  created_at timestamptz not null default now()
);

create index classroom_materials_class_idx on public.classroom_materials (classroom_id);
alter table public.classroom_materials enable row level security;
revoke all on public.classroom_materials from anon, authenticated;
grant all on public.classroom_materials to service_role;
