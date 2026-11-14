import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rikwramzpveuofxdlzha.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

try {
  const endpoint = new URL("/auth/v1/settings", url);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co")) {
    throw new Error("Supabase 호스팅 프로젝트의 HTTPS URL을 입력하세요.");
  }
  if (!key?.startsWith("sb_publishable_")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY에 Supabase Publishable key를 설정하세요.");
  }
  const response = await fetch(endpoint, {
    headers: { apikey: key },
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  await response.body?.cancel();
  console.log(`Supabase Auth API HTTP ${response.status}`);
  if (!response.ok) {
    throw new Error("Auth API 요청이 거절됐습니다. 프로젝트 URL과 키를 확인하세요.");
  }
  console.log("Publishable key로 Supabase Auth API에 연결했습니다.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
