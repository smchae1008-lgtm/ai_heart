"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main>
      <h1>AI 마음이 로그인</h1>
      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <label>이메일 <input name="email" type="email" autoComplete="email" required readOnly={!!state.email} defaultValue={state.email} /></label>
        {state.email && <label>인증 코드 <input name="token" inputMode="numeric" autoComplete="one-time-code" required /></label>}
        <button disabled={pending}>{state.email ? "로그인" : "인증 코드 받기"}</button>
      </form>
      {state.email && <a href={"/login?next=" + encodeURIComponent(next)}>다른 이메일 사용 또는 코드 다시 받기</a>}
      {state.error && <p role="alert">{state.error}</p>}
    </main>
  );
}
