"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "../../lib/supabase/server";

export type LoginState = { email?: string; error?: string };

export async function login(state: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "이메일 주소를 확인해 주세요." };
  }

  const client = await createSupabaseClient();
  if (!client) return { error: "인증 서버 설정이 아직 준비되지 않았습니다." };

  if (state.email !== email) {
    const { error } = await client.auth.signInWithOtp({ email });
    return error ? { error: "인증 코드 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." } : { email };
  }

  const token = String(form.get("token") ?? "").trim();
  if (!/^\d{6,8}$/.test(token)) return { email, error: "메일에 있는 인증 코드를 입력해 주세요." };
  const { error } = await client.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { email, error: "인증 코드가 일치하지 않거나 만료됐습니다." };
  const next = String(form.get("next") ?? "");
  redirect(/^\/class\/[0-9a-f-]{36}$/i.test(next) ? next : "/account");
}
