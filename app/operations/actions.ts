"use server";

import { redirect } from "next/navigation";
import { bucket, verificationContext } from "../../lib/verification";

export async function reviewCertificate(form: FormData) {
  const context = await verificationContext();
  if (!context?.operator) redirect("/account");
  const id = String(form.get("id") ?? "");
  const decision = form.get("decision");
  const reason = String(form.get("reason") ?? "").trim();
  if ((decision !== "approved" && decision !== "rejected") ||
      (decision === "rejected" && (!reason || reason.length > 500))) {
    redirect("/operations?result=invalid");
  }
  const table = context.admin.from("teacher_verifications");
  const { data: updated, error: saveError } = await table.update({
    status: decision,
    reviewed_by: context.user.id, reviewed_at: new Date().toISOString(),
    rejection_reason: decision === "rejected" ? reason : null,
  }).eq("id", id).eq("status", "pending").select("certificate_path").maybeSingle();
  if (saveError || !updated) redirect("/operations?result=failed");
  await deleteReviewedCertificate(context, id, updated.certificate_path);
  redirect("/operations");
}

async function deleteReviewedCertificate(
  context: NonNullable<Awaited<ReturnType<typeof verificationContext>>>,
  id: string,
  path: string | null,
) {
  if (!path) return;
  const removal = await context.admin.storage.from(bucket).remove([path]);
  if (removal.error) redirect("/operations?result=cleanup");
  const { error } = await context.admin.from("teacher_verifications").update({ certificate_path: null })
    .eq("id", id).eq("certificate_path", path);
  if (error) redirect("/operations?result=cleanup");
}

export async function retryCertificateDeletion(form: FormData) {
  const context = await verificationContext();
  if (!context?.operator) redirect("/account");
  const id = String(form.get("id") ?? "");
  const { data, error } = await context.admin.from("teacher_verifications").select("certificate_path")
    .eq("id", id).neq("status", "pending").maybeSingle();
  if (error) redirect("/operations?result=cleanup");
  await deleteReviewedCertificate(context, id, data?.certificate_path ?? null);
  redirect("/operations");
}
