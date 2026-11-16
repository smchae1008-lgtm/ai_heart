"use client";

import { useActionState, useState } from "react";
import { replyToInquiry } from "./actions";

export function ReplyForm({ inquiryId }: { inquiryId: string }) {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(
    replyToInquiry.bind(null, inquiryId), {},
  );
  const [answer, setAnswer] = useState("");
  return (
    <form action={action}>
      <label>학부모에게 보낼 답변
        <textarea name="answer" rows={5} maxLength={2000} value={answer} required
          onChange={event => setAnswer(event.target.value)} aria-describedby="reply-hint" />
      </label>
      <p id="reply-hint">보낸 답변은 학부모의 학급 챗봇 대화에 표시돼요.</p>
      {state.error && <p role="alert">{state.error}</p>}
      <button disabled={pending}>{pending ? "보내는 중…" : "답변 보내기"}</button>
    </form>
  );
}
