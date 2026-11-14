import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseClient } from "../../lib/supabase/server";

export default async function AccountPage() {
  await connection();
  const client = await createSupabaseClient();
  const result = await client?.auth.getClaims();
  const account = result?.data?.claims;
  if (!account?.sub) redirect("/login");

  return (
    <main>
      <h1>내 계정</h1>
      <p>{account.email}</p>
    </main>
  );
}
