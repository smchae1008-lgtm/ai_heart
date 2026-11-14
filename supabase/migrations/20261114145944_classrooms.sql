create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  official_contact text not null default '' check (length(official_contact) <= 300),
  greeting text not null check (length(btrim(greeting)) between 1 and 1000),
  tone smallint not null default 3 check (tone between 1 and 5),
  consultation jsonb not null,
  published boolean not null default false check (not published or btrim(official_contact) <> ''),
  join_code uuid not null default gen_random_uuid(),
  code_version integer not null default 1,
  created_at timestamptz not null default now()
);

create index classrooms_teacher_id_idx on public.classrooms (teacher_id);

create table public.classroom_admissions (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  code_version integer not null,
  primary key (classroom_id, parent_id)
);

alter table public.classrooms enable row level security;
alter table public.classroom_admissions enable row level security;
revoke all on public.classrooms, public.classroom_admissions from anon, authenticated;
grant select on public.classrooms to authenticated;
grant all on public.classrooms, public.classroom_admissions to service_role;
create policy "Teachers read their own classrooms" on public.classrooms
  for select to authenticated using (teacher_id = (select auth.uid()));

create function public.join_classroom(class_id uuid, entrant_id uuid, presented_code uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  version integer;
begin
  select c.code_version into version from public.classrooms c
    where c.id = class_id and c.published and c.join_code = presented_code
      and (now() at time zone 'Asia/Seoul')::date between c.starts_on and c.ends_on
    for update;
  if not found then return false; end if;
  insert into public.classroom_admissions (classroom_id, parent_id, code_version)
  values (class_id, entrant_id, version)
  on conflict (classroom_id, parent_id) do update set code_version = excluded.code_version;
  return true;
end;
$$;
revoke all on function public.join_classroom(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.join_classroom(uuid, uuid, uuid) to service_role;

create function public.rotate_classroom_code(class_id uuid, owner_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.classrooms set join_code = gen_random_uuid(), code_version = code_version + 1
    where id = class_id and teacher_id = owner_id;
  return found;
end;
$$;
revoke all on function public.rotate_classroom_code(uuid, uuid) from public, anon, authenticated;
grant execute on function public.rotate_classroom_code(uuid, uuid) to service_role;
