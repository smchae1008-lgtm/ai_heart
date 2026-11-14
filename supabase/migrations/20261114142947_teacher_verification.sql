create table public.teacher_verifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  school_year integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  certificate_path text,
  rejection_reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'rejected') = (rejection_reason is not null)),
  check ((status = 'pending') = (reviewed_at is null))
);

create unique index teacher_verifications_current_request
  on public.teacher_verifications (teacher_id, school_year)
  where status in ('pending', 'approved');

alter table public.teacher_verifications enable row level security;
revoke all on public.teacher_verifications from anon, authenticated;
grant select (id, teacher_id, school_year, status, rejection_reason, reviewed_at, created_at)
  on public.teacher_verifications to authenticated;
grant all on public.teacher_verifications to service_role;

create policy "Teachers read own verification status"
  on public.teacher_verifications for select to authenticated
  using ((select auth.uid()) = teacher_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-certificates', 'teacher-certificates', false, 6291456, array['application/pdf']);
