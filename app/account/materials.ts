"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { verificationContext, maxCertificateBytes } from "../../lib/verification";

export async function uploadMaterial(form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const id = String(form.get("id") ?? "");
  const { data: classroom } = await context.admin.from("classrooms").select("id")
    .eq("id", id).eq("teacher_id", context.user.id).eq("deleting", false).maybeSingle();
  if (!classroom) redirect("/account?result=material-failed");
  const file = form.get("material");
  if (!(file instanceof File) || file.size > maxCertificateBytes || file.type !== "application/pdf" ||
      await file.slice(0, 5).text() !== "%PDF-") redirect("/account?result=material-invalid");

  const bytes = new Uint8Array(await file.arrayBuffer());
  let pages: { number: number; text: string }[];
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes.slice() });
    try {
      const extracted = await parser.getText({ first: 40 });
      pages = extracted.pages.flatMap(page => {
        const text = page.text.trim().slice(0, 8000);
        return text ? [{ number: page.num, text }] : [];
      });
    } finally {
      await parser.destroy();
    }
  } catch {
    redirect("/account?result=material-invalid");
  }
  if (!pages.length) redirect("/account?result=material-invalid");

  const materialId = randomUUID();
  const path = id + "/" + materialId + ".pdf";
  const storage = context.admin.storage.from("classroom-materials");
  const { error: uploadError } = await storage.upload(path, bytes, { contentType: "application/pdf" });
  if (uploadError) redirect("/account?result=material-failed");
  const { error } = await context.admin.from("classroom_materials").insert({
    id: materialId, classroom_id: id, name: file.name.slice(0, 200), storage_path: path, pages,
  });
  if (error) {
    await storage.remove([path]);
    redirect("/account?result=material-failed");
  }
  redirect("/account");
}
