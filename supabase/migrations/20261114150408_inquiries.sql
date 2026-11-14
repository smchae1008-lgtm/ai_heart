create table public.classroom_inquiries (
  id uuid primary key,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  code_version integer not null,
  message text not null check (length(message) between 1 and 2000),
  category text not null check (category in ('simple','general','abuse')),
  priority text not null check (priority in ('high','medium','low')),
  summary text not null,
  reply text not null,
  notify_at timestamptz,
  created_at timestamptz not null default now()
);
create index classroom_inquiries_thread_idx on public.classroom_inquiries (classroom_id, parent_id, code_version, created_at);
alter table public.classroom_inquiries enable row level security;
revoke all on public.classroom_inquiries from anon, authenticated;
grant all on public.classroom_inquiries to service_role;

create function public.submit_classroom_inquiry(
  class_id uuid, entrant_id uuid, expected_version integer, request_id uuid,
  body text, kind text, urgency text, digest text, answer text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  classroom public.classrooms%rowtype;
  seoul_now timestamp := statement_timestamp() at time zone 'Asia/Seoul';
  warning_count integer;
  notification timestamptz;
  slot jsonb;
  slot_date date;
  slot_start time;
  slot_end time;
  offset_days integer;
begin
  select * into classroom from public.classrooms where id = class_id for update;
  if not found or not classroom.published or classroom.code_version <> expected_version
    or seoul_now::date not between classroom.starts_on and classroom.ends_on
    or not exists (select 1 from public.classroom_admissions a
      where a.classroom_id = class_id and a.parent_id = entrant_id and a.code_version = expected_version)
  then return false; end if;
  if exists (select 1 from public.classroom_inquiries i where i.id = request_id
    and i.classroom_id = class_id and i.parent_id = entrant_id and i.code_version = expected_version)
  then return true; end if;
  select count(*) into warning_count from public.classroom_inquiries i
    where i.classroom_id = class_id and i.parent_id = entrant_id
      and i.code_version = expected_version and i.category = 'abuse';
  if warning_count >= 2 then return false; end if;
  if kind = 'abuse' and warning_count = 1 then
    answer := '이 대화는 종료되었습니다. 아래 학교 공식 문의처를 이용해 주세요.';
  end if;

  if kind <> 'simple' then
    if urgency = 'high' then
      notification := statement_timestamp();
    else
      for offset_days in 0..7 loop
        slot_date := seoul_now::date + offset_days;
        slot := classroom.consultation -> (extract(dow from slot_date)::integer::text);
        slot_start := nullif(slot ->> 0, '')::time;
        slot_end := nullif(slot ->> 1, '')::time;
        if slot_start is null or slot_end is null then continue; end if;
        if slot_date + slot_end > seoul_now then
          notification := greatest(slot_date + slot_start, seoul_now) at time zone 'Asia/Seoul';
          exit;
        end if;
      end loop;
    end if;
  end if;

  if kind = 'general' then
    answer := case
      when urgency = 'high' then '선생님께 문의를 전달했습니다. 즉시 도움이 필요하면 학교 공식 문의처를 이용해 주세요.'
      when notification > statement_timestamp() then '선생님께 문의를 전달했습니다. 다음 상담 시간에 확인하실 수 있습니다.'
      else '선생님께 문의를 전달했습니다.'
    end;
  end if;
  insert into public.classroom_inquiries
    (id, classroom_id, parent_id, code_version, message, category, priority, summary, reply, notify_at)
  values (request_id, class_id, entrant_id, expected_version, body, kind, urgency, digest, answer, notification)
  on conflict (id) do nothing;
  return found;
end;
$$;
revoke all on function public.submit_classroom_inquiry(uuid,uuid,integer,uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_classroom_inquiry(uuid,uuid,integer,uuid,text,text,text,text,text) to service_role;
