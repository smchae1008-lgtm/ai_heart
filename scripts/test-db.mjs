import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const teacher = randomUUID(), outsider = randomUUID(), parent = randomUUID();
const classId = randomUUID(), code = randomUUID();
const submit = async (id, category, priority, version = 1) => {
  const { rows } = await db.query(
    "select public.submit_classroom_inquiry($1,$2,$3,$4,$5,$6,$7,$8,$9) as ok",
    [classId, parent, version, id, "Synthetic question", category, priority, "Synthetic summary", "Warning"],
  );
  return rows[0].ok;
};

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to authenticated;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter(file => file.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  }
  await db.query("insert into auth.users values ($1),($2),($3)", [teacher, outsider, parent]);
  const verificationId = randomUUID();
  await db.query("insert into public.teacher_verifications (id,teacher_id,school_year,certificate_path) values ($1,$2,2026,'private.pdf')", [verificationId, teacher]);
  await db.query(`insert into public.classrooms
    (id,teacher_id,name,starts_on,ends_on,official_contact,greeting,published,join_code,consultation)
    values ($1,$2,'Test class','2000-01-01','2100-01-01','Test office','Hello',true,$3,$4)`,
    [classId, teacher, code, JSON.stringify(Object.fromEntries(
      Array.from({ length: 7 }, (_, day) => [day, ["00:00", "23:59"]]),
    ))]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [outsider]);
  await db.exec("set role authenticated");
  assert.equal((await db.query("select id from public.classrooms")).rows.length, 0);
  assert.equal((await db.query("select id from public.teacher_verifications")).rows.length, 0);
  await assert.rejects(db.query("select * from public.classroom_inquiries"), /permission denied/);
  await assert.rejects(db.query("select public.rotate_classroom_code($1,$2)", [classId, teacher]), /permission denied/);
  await assert.rejects(db.query("select public.reply_to_classroom_inquiry($1,$2,'Test reply')", [randomUUID(), teacher]), /permission denied/);
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [teacher]);
  await db.exec("set role authenticated");
  assert.equal((await db.query("select status from public.teacher_verifications")).rows[0].status, "pending");
  await assert.rejects(db.query("select certificate_path from public.teacher_verifications"), /permission denied/);
  await assert.rejects(db.query("update public.teacher_verifications set status='approved'"), /permission denied/);
  await db.exec("reset role");
  await db.exec("set role service_role");
  await db.query("update public.teacher_verifications set status='rejected', rejection_reason='Synthetic reason', reviewed_at=now(), certificate_path=null where id=$1", [verificationId]);
  await db.query("insert into public.teacher_verifications (teacher_id,school_year) values ($1,2026)", [teacher]);
  await assert.rejects(db.query("insert into public.teacher_verifications (teacher_id,school_year) values ($1,2026)", [teacher]), /duplicate key/);
  const join = async (value) => (await db.query("select public.join_classroom($1,$2,$3) as ok", [classId,parent,value])).rows[0].ok;
  assert.equal(await join(randomUUID()), false);
  assert.equal(await join(code), true);
  await db.exec(`update public.classrooms set consultation = jsonb_build_object(
    ((extract(dow from (now() at time zone 'Asia/Seoul'))::integer + 1) % 7)::text,
    jsonb_build_array('09:00','10:00'))`);
  const deferredId = randomUUID();
  assert.equal(await submit(deferredId, "general", "low"), true);
  const deferred = (await db.query("select notify_at > now() as deferred, reply from public.classroom_inquiries where id=$1", [deferredId])).rows[0];
  assert.equal(deferred.deferred, true);
  assert.match(deferred.reply, /다음 상담 시간/);
  assert.equal(await join(code), true);
  assert.equal((await db.query("select * from public.classroom_admissions")).rows.length, 1);
  const urgentId = randomUUID();
  assert.equal(await submit(urgentId, "general", "high"), true);
  assert.equal(await submit(urgentId, "general", "high"), true);
  const urgent = (await db.query("select priority, notify_at <= now() as visible from public.classroom_inquiries where id=$1", [urgentId])).rows[0];
  assert.deepEqual(urgent, { priority: "high", visible: true });
  const replyTo = async (id, owner, answer) => (await db.query(
    "select public.reply_to_classroom_inquiry($1,$2,$3) as ok", [id, owner, answer],
  )).rows[0].ok;
  assert.equal(await replyTo(urgentId, outsider, "Unauthorized reply"), false);
  assert.equal(await replyTo(urgentId, teacher, "  "), false);
  assert.equal(await replyTo(urgentId, teacher, "  Teacher reply  "), true);
  assert.equal(await replyTo(urgentId, teacher, "Duplicate reply"), false);
  assert.equal((await db.query("select teacher_reply from public.classroom_inquiries where id=$1", [urgentId])).rows[0].teacher_reply, "Teacher reply");
  const firstWarning = randomUUID();
  assert.equal(await submit(firstWarning, "abuse", "medium"), true);
  assert.equal((await db.query("select reply from public.classroom_inquiries where id=$1", [firstWarning])).rows[0].reply, "Warning");
  const secondWarning = randomUUID();
  assert.equal(await submit(secondWarning, "abuse", "medium"), true);
  assert.match((await db.query("select reply from public.classroom_inquiries where id=$1", [secondWarning])).rows[0].reply, /종료/);
  assert.equal(await submit(randomUUID(), "general", "low"), false);
  assert.equal((await db.query("select public.rotate_classroom_code($1,$2) as ok", [classId, outsider])).rows[0].ok, false);
  assert.equal((await db.query("select public.rotate_classroom_code($1,$2) as ok", [classId, teacher])).rows[0].ok, true);
  assert.equal(await join(code), false);
  assert.equal(await replyTo(deferredId, teacher, "Reply to prior code"), false);
  assert.equal(await submit(randomUUID(), "general", "low"), false);
  const newCode = (await db.query("select join_code from public.classrooms where id=$1", [classId])).rows[0].join_code;
  assert.equal(await join(newCode), true);
  await db.query("update public.classrooms set ends_on='2001-01-01' where id=$1", [classId]);
  assert.equal(await submit(randomUUID(), "general", "low", 2), false);
  await db.query("update public.classrooms set published=false,deleting=true where id=$1", [classId]);
  await assert.rejects(db.query("insert into public.classroom_materials values ($1,$2,'Test PDF','test.pdf','[]')", [randomUUID(), classId]), /Classroom is unavailable/);
  await db.query("delete from public.classrooms where id=$1", [classId]);
  assert.equal((await db.query("select * from public.classroom_admissions")).rows.length, 0);
  assert.equal((await db.query("select * from public.classroom_inquiries")).rows.length, 0);
  await db.exec("reset role");
  assert.equal((await db.query("select * from auth.users")).rows.length, 3);
  console.log("PASS: migrations, RLS, admission, code rotation, inquiry idempotency, warnings, end date and cascade");
} finally {
  await db.close();
}
