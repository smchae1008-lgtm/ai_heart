"use server";
import { redirect } from "next/navigation";
import { hasTeacherPilotAccess, schoolYear, verificationContext } from "../../lib/verification";

export type ClassFormState = {
  attempt: number;
  values?: Record<string, string>;
  errors?: Record<string, string>;
  message?: string;
};

function validDate(value: string) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith("0000-")) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function saveClass(previous: ClassFormState, form: FormData): Promise<ClassFormState> {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const values: Record<string, string> = {};
  const value = (key: string) => {
    const raw = form.get(key);
    values[key] = typeof raw === "string" ? raw : "";
    return values[key].trim();
  };
  const errors: Record<string, string> = {};
  const failure = (message?: string) => ({ attempt: previous.attempt + 1, values, errors, message });
  const id = value("id");
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const consultation = Object.fromEntries(Array.from({ length: 7 }, (_, day) => {
    const startKey = "start_" + day;
    const endKey = "end_" + day;
    const start = value(startKey);
    const end = value(endKey);
    if (start || end) {
      if (!time.test(start)) errors[startKey] = "시작 시간을 입력해 주세요.";
      if (!time.test(end)) errors[endKey] = "종료 시간을 입력해 주세요.";
      else if (time.test(start) && start >= end) errors[endKey] = "종료 시간은 시작 시간보다 늦어야 해요.";
    }
    return [day, [start, end]];
  }));
  value("template");
  const record = {
    name: value("name"), starts_on: value("starts"), ends_on: value("ends"),
    official_contact: value("contact"), greeting: value("greeting"), tone: Number(value("tone")),
    consultation, published: value("published") === "on",
  };
  if (!record.name || record.name.length > 100) errors.name = "학급명을 1~100자로 입력해 주세요.";
  if (!validDate(record.starts_on)) errors.starts = "올바른 시작일을 입력해 주세요.";
  if (!validDate(record.ends_on)) errors.ends = "올바른 종료일을 입력해 주세요.";
  else if (!errors.starts && record.ends_on < record.starts_on) errors.ends = "종료일은 시작일과 같거나 이후여야 해요.";
  if (record.published && !record.official_contact) errors.contact = "학부모 입장을 허용하려면 학교 공식 문의처를 입력해 주세요.";
  else if (record.official_contact.length > 300) errors.contact = "공식 문의처를 300자 이내로 입력해 주세요.";
  if (!record.greeting || record.greeting.length > 1000) errors.greeting = "첫인사를 1~1,000자로 입력해 주세요.";
  if (!Number.isInteger(record.tone) || record.tone < 1 || record.tone > 5) errors.tone = "말투를 선택해 주세요.";
  if (Object.keys(errors).length) return failure();
  const table = context.admin.from("classrooms");
  if (!id && !hasTeacherPilotAccess(context.user.app_metadata)) {
    const { data, error } = await context.admin.from("teacher_verifications").select("id")
      .eq("teacher_id", context.user.id).eq("school_year", schoolYear()).eq("status", "approved").maybeSingle();
    if (error || !data) return failure("이번 학년도 교원 인증을 확인할 수 없습니다. 승인 상태를 확인해 주세요.");
  }
  const { data, error } = id
    ? await table.update(record).eq("id", id).eq("teacher_id", context.user.id).eq("deleting", false).select("id").maybeSingle()
    : await table.insert({ ...record, teacher_id: context.user.id }).select("id").single();
  if (error || !data) return failure("학급을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  redirect("/account");
}

export async function deleteClass(form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const id = String(form.get("id") ?? "");
  if (form.get("confirm") !== "on") redirect("/account?result=delete-confirm");

  const classrooms = context.admin.from("classrooms");
  const { data: classroom, error: closeError } = await classrooms
    .update({ published: false, deleting: true }).eq("id", id)
    .eq("teacher_id", context.user.id).select("id").maybeSingle();
  if (closeError || !classroom) redirect("/account?result=delete-failed");

  const storage = context.admin.storage.from("classroom-materials");
  // Start from the first page each time because deleting shifts subsequent pages.
  while (true) {
    const { data: files, error } = await storage.list(classroom.id, { limit: 100 });
    if (error || !files) redirect("/account?result=delete-retry");
    if (!files.length) break;
    const { data: removed, error: removeError } = await storage.remove(files.map(file => classroom.id + "/" + file.name));
    if (removeError || !removed?.length) redirect("/account?result=delete-retry");
  }

  const { error } = await classrooms.delete().eq("id", classroom.id)
    .eq("teacher_id", context.user.id).eq("deleting", true);
  if (error) redirect("/account?result=delete-retry");
  redirect("/account");
}

export async function rotateCode(form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const { data, error } = await context.admin.rpc("rotate_classroom_code", {
    class_id: String(form.get("id") ?? ""), owner_id: context.user.id,
  });
  if (error || !data) redirect("/account?result=class-invalid");
  redirect("/account");
}
