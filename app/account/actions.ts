"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { bucket, maxCertificateBytes, schoolYear, verificationContext } from "../../lib/verification";

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
