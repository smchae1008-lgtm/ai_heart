import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rikwramzpveuofxdlzha.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

try {
  const endpoint = new URL("/rest/v1/", url);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co")) {
    throw new Error("Supabase 호스팅 프로젝트의 HTTPS URL을 입력하세요.");
  }
  if (key && !key.startsWith("sb_publishable_")) {
    throw new Error("Supabase Publishable key를 입력하세요.");
  }
  const response = await fetch(endpoint, {
    headers: key ? { apikey: key } : {},
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  await response.body?.cancel();
  console.log(`Supabase Data API HTTP ${response.status}`);
  if (!key) {
    console.error("Publishable key가 없어 키를 포함한 연결 검증을 완료할 수 없습니다.");
    process.exitCode = 1;
  } else if (!response.ok) {
    console.error("Data API 요청이 거절됐습니다. 프로젝트 URL과 키를 확인하세요.");
    process.exitCode = 1;
  } else {
    console.log("Publishable key로 Data API에 연결했습니다.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
