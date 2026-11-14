"use server";
import { redirect } from "next/navigation";
import { verificationContext } from "../../../lib/verification";
import { classifyInquiry, selectSources } from "../../../lib/inquiry";

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

export async function sendInquiry(id: string, version: number, requestId: string, form: FormData) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const path = "/class/" + id;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)) {
    redirect(path + "?result=message");
  }
  const message = String(form.get("message") ?? "").trim();
  if (!message || message.length > 2000) redirect(path + "?result=message");
  const { data: classroom } = await context.admin.from("classrooms")
    .select("starts_on,ends_on,tone").eq("id", id).eq("published", true).eq("code_version", version).maybeSingle();
  const { data: admission } = await context.admin.from("classroom_admissions").select("parent_id")
    .eq("classroom_id", id).eq("parent_id", context.user.id).eq("code_version", version).maybeSingle();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" }).format(new Date());
  if (!classroom || !admission || today < classroom.starts_on || today > classroom.ends_on) redirect(path);
  const { data: existing } = await context.admin.from("classroom_inquiries").select("id,category")
    .eq("classroom_id", id).eq("parent_id", context.user.id).eq("code_version", version)
    .or("category.eq.abuse,id.eq." + requestId);
  if (existing?.some(row => row.id === requestId) || (existing?.length ?? 0) >= 2) redirect(path);

  const { data: documents } = await context.admin.from("classroom_materials").select("id,name,pages").eq("classroom_id", id);
  const sanitized = (value: string) => value.replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, "[이메일]")
    .replace(/(?:\+82[- ]?|0)\d{1,2}[- ]?\d{3,4}[- ]?\d{4}/g, "[연락처]");
  const sources = selectSources(sanitized(message), documents ?? []).map(source => ({ ...source, text: sanitized(source.text) }));
  const decision = await classifyInquiry(sanitized(message), sources);
  const category = decision?.category ?? "general";
  const introductions = ["자료 안내", "학급 자료를 확인했습니다", "학급 자료에 따르면", "학급 자료를 확인해 주세요", "학급 자료에서 확인한 내용을 안내해 드릴게요"];
  const reply = category === "abuse"
    ? "욕설이나 교사의 사생활을 침해하는 표현, 개인 연락처 요청에는 답변할 수 없습니다. 문의 내용을 정중하게 다시 작성해 주세요. 학교의 확인이 필요한 경우 아래 공식 문의처를 이용해 주세요."
    : decision?.evidence ? introductions[classroom.tone - 1] + "\n" + decision.evidence.quote +
        "\n출처 · " + decision.evidence.name + " " + decision.evidence.page + "쪽" : "";
  const { data, error } = await context.admin.rpc("submit_classroom_inquiry", {
    class_id: id, entrant_id: context.user.id, expected_version: version, request_id: requestId,
    body: message, kind: category, urgency: decision?.priority ?? "high",
    digest: decision?.summary.trim().slice(0, 500) || "자동 분류 결과를 확인하지 못했습니다. 원문을 확인해 주세요.",
    answer: reply,
  });
  redirect(path + (data && !error ? "" : "?result=message"));
}
