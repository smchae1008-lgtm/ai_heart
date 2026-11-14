"use server";
import { redirect } from "next/navigation";
import { schoolYear, verificationContext } from "../../lib/verification";

export async function saveClass(form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const id = value("id");
  const consultation = Object.fromEntries(Array.from({ length: 7 }, (_, day) => [
    day, [value("start_" + day), value("end_" + day)],
  ]));
  if (Object.values(consultation).some(([start, end]) =>
    (start || end) && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end))) {
    redirect("/account?result=class-invalid");
  }
  const record = {
    name: value("name"), starts_on: value("starts"), ends_on: value("ends"),
    official_contact: value("contact"), greeting: value("greeting"), tone: Number(value("tone")),
    consultation, published: form.get("published") === "on",
  };
  if (!record.name || !record.greeting || (record.published && !record.official_contact)) {
    redirect("/account?result=class-invalid");
  }
  const table = context.admin.from("classrooms");
  if (!id) {
    const { data, error } = await context.admin.from("teacher_verifications").select("id")
      .eq("teacher_id", context.user.id).eq("school_year", schoolYear()).eq("status", "approved").maybeSingle();
    if (error || !data) redirect("/account?result=class-denied");
  }
  const { data, error } = id
    ? await table.update(record).eq("id", id).eq("teacher_id", context.user.id).eq("deleting", false).select("id").maybeSingle()
    : await table.insert({ ...record, teacher_id: context.user.id }).select("id").single();
  if (error || !data) redirect("/account?result=class-invalid");
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
