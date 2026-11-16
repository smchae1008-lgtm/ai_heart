"use client";

import { useActionState } from "react";
import { joinClassByCode } from "../class/[id]/actions";

export function JoinForm() {
  const [state, action, pending] = useActionState(joinClassByCode, {});
  return (
    <form action={action}>
      <label>학급 코드
        <input name="code" required maxLength={36} autoComplete="off" spellCheck={false}
          aria-invalid={state.invalid || undefined} aria-describedby={state.invalid ? "join-error" : undefined} />
      </label>
      {state.invalid && <p id="join-error" role="alert">이 코드로 입장할 수 없어요. 최신 코드와 학급 운영 기간을 확인해 주세요.</p>}
      <button disabled={pending}>{pending ? "입장 확인 중…" : "입장"}</button>
    </form>
  );
}
