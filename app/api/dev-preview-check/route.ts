import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serverKey = process.env.SUPABASE_SECRET_KEY;
  if (process.env.VERCEL_ENV !== "preview" ||
      url !== "https://lhxalfeobkmyooycpouc.supabase.co" ||
      !publishableKey || !serverKey) {
    return new Response(null, { status: 404 });
  }

  const admin = createClient(url, serverKey, { auth: { persistSession: false } });
  const [auth, database] = await Promise.all([
    fetch(new URL("/auth/v1/settings", url), { headers: { apikey: publishableKey }, cache: "no-store" }),
    admin.from("classrooms").select("id", { head: true, count: "exact" }),
  ]);
  return Response.json({ auth: auth.ok, database: !database.error }, {
    status: auth.ok && !database.error ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
