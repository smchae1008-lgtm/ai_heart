"use server";
import { redirect } from "next/navigation";
import { verificationContext } from "../../../lib/verification";

export async function joinClass(id: string, form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/login?next=" + encodeURIComponent("/class/" + id));
  const code = String(form.get("code") ?? "").trim();
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) redirect("/");
  if (!uuid.test(code)) redirect("/class/" + id + "?result=invalid");
  const { data, error } = await context.admin.rpc("join_classroom", {
    class_id: id, entrant_id: context.user.id, presented_code: code,
  });
  redirect("/class/" + id + (data && !error ? "" : "?result=invalid"));
}
