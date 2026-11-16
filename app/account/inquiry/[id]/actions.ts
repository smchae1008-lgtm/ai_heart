"use server";

import { redirect } from "next/navigation";
import { verificationContext } from "../../../../lib/verification";

export async function replyToInquiry(id: string, _previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const value = form.get("answer");
  const answer = typeof value === "string" ? value.trim() : "";
  if (!answer || answer.length > 2000) return { error: "답변을 1~2,000자로 입력해 주세요." };
  const { data, error } = await context.admin.rpc("reply_to_classroom_inquiry", {
    inquiry_id: id, owner_id: context.user.id, answer,
  });
  if (error || !data) return { error: "답변을 보내지 못했어요. 이미 답변했거나 학급 입장 상태가 바뀌었는지 확인해 주세요." };
  redirect("/account/inquiry/" + id);
}
