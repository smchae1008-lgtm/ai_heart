"use client";

import { useFormStatus } from "react-dom";

export function SendButton() {
  const { pending } = useFormStatus();
  return (
    <div className="inquiry-submit">
      <button disabled={pending}>{pending ? "보내는 중…" : "문의 보내기"}</button>
      <span role="status">{pending ? "문의 내용을 확인하고 있어요." : ""}</span>
    </div>
  );
}
