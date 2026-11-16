"use server";

import { redirect } from "next/navigation";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { bucket, hasTeacherPilotAccess, maxCertificateBytes, schoolYear, teacherPilotCode, verificationContext } from "../../lib/verification";

export async function redeemTeacherPilotCode(form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const expected = teacherPilotCode();
  const value = form.get("pilot_code");
  const code = typeof value === "string" ? value.trim() : "";
  if (!expected || !context.user.email_confirmed_at) redirect("/account?result=pilot-unavailable");
  if (hasTeacherPilotAccess(context.user.app_metadata)) redirect("/account");
  if (!/^[0-9]{4}$/.test(code) || !timingSafeEqual(Buffer.from(code), Buffer.from(expected))) {
    redirect("/account?result=pilot-invalid");
  }
  const { error } = await context.admin.auth.admin.updateUserById(context.user.id, {
    app_metadata: { maeumi_teacher_pilot_year: schoolYear() },
  });
  redirect(error ? "/account?result=pilot-unavailable" : "/account");
}

export async function submitCertificate(form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/account?result=unavailable");
  const file = form.get("certificate");
  if (!(file instanceof File) || file.size < 5 || file.size > maxCertificateBytes ||
      file.type !== "application/pdf" || await file.slice(0, 5).text() !== "%PDF-") {
    redirect("/account?result=invalid");
  }

  const path = context.user.id + "/" + randomUUID() + ".pdf";
  const storage = context.admin.storage.from(bucket);
  const { error: uploadError } = await storage.upload(path, file, { contentType: "application/pdf" });
  if (uploadError) redirect("/account?result=failed");

  const { error } = await context.admin.from("teacher_verifications").insert({
    teacher_id: context.user.id, school_year: schoolYear(), certificate_path: path,
  });
  if (error) {
    await storage.remove([path]);
    redirect("/account?result=failed");
  }
  redirect("/account");
}
