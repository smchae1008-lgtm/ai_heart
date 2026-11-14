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
    ? await table.update(record).eq("id", id).eq("teacher_id", context.user.id).select("id").maybeSingle()
    : await table.insert({ ...record, teacher_id: context.user.id }).select("id").single();
  if (error || !data) redirect("/account?result=class-invalid");
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
