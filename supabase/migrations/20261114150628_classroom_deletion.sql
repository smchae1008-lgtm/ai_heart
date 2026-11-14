alter table public.classrooms add column deleting boolean not null default false;
alter table public.classrooms add constraint deleting_classrooms_are_unpublished
  check (not deleting or not published);

create function public.guard_classroom_material_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.classrooms where id = new.classroom_id and not deleting for update;
  if not found then raise exception 'Classroom is unavailable'; end if;
  return new;
end;
$$;
revoke all on function public.guard_classroom_material_insert() from public, anon, authenticated;
create trigger classroom_material_insert_guard before insert on public.classroom_materials
  for each row execute function public.guard_classroom_material_insert();
