alter table public.classroom_inquiries
  add column teacher_reply text
    check (length(btrim(teacher_reply)) between 1 and 2000);

create function public.reply_to_classroom_inquiry(inquiry_id uuid, owner_id uuid, answer text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  classroom public.classrooms%rowtype;
  seoul_today date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
begin
  select c.* into classroom
  from public.classrooms c
  join public.classroom_inquiries i on i.classroom_id = c.id
  where i.id = inquiry_id and c.teacher_id = owner_id
  for update of c;
  if not found or answer is null or length(btrim(answer)) not between 1 and 2000
    or not classroom.published or classroom.deleting
    or seoul_today not between classroom.starts_on and classroom.ends_on
  then return false; end if;

  update public.classroom_inquiries i
  set teacher_reply = btrim(answer)
  where i.id = inquiry_id and i.classroom_id = classroom.id
    and i.category <> 'simple' and i.teacher_reply is null
    and i.code_version = classroom.code_version
    and exists (select 1 from public.classroom_admissions a where a.classroom_id = i.classroom_id
      and a.parent_id = i.parent_id and a.code_version = i.code_version);
  return found;
end;
$$;

revoke all on function public.reply_to_classroom_inquiry(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reply_to_classroom_inquiry(uuid, uuid, text) to service_role;
