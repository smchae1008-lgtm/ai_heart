import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "./supabase/server";

export const bucket = "teacher-certificates";
export const maxCertificateBytes = 4 * 1024 * 1024;

export function schoolYear(date = new Date()) {
  const [year, month] = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit",
  }).format(date).split("-").map(Number);
  return month < 3 ? year - 1 : year;
}

export async function verificationContext() {
  const client = await createSupabaseClient();
  const result = await client?.auth.getUser();
  const user = result?.data?.user;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!user || !url || !key) return null;
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user, admin, operator: user.app_metadata.maeumi_role === "operator" };
}
