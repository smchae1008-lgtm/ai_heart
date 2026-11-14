import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseClient } from "../../lib/supabase/server";
import { schoolYear } from "../../lib/verification";
import { submitCertificate } from "./actions";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  await connection();
  const client = await createSupabaseClient();
  const result = await client?.auth.getClaims();
  const account = result?.data?.claims;
  if (!client || !account?.sub) redirect("/login");
  const { result: submission } = await searchParams;
  const year = schoolYear();
  const { data: verification, error } = await client.from("teacher_verifications")
    .select("status, rejection_reason").eq("teacher_id", account.sub)
    .eq("school_year", year).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const canApply = !error && (!verification || verification.status === "rejected");

  return (
    <main>
      <h1>내 계정</h1>
      <p>{account.email}</p>
      {account.app_metadata?.maeumi_role === "operator" && <a href="/operations">교원 인증 검토</a>}
      <h2>{year}학년도 교원 인증</h2>
      {error && <p role="alert">인증 상태를 불러오지 못했습니다.</p>}
      {submission && <p role="alert">{submission === "invalid"
        ? "4 MB 이하의 PDF 증명서를 선택해 주세요."
        : "증명서를 제출하지 못했습니다. 잠시 후 다시 시도해 주세요."}</p>}
      {verification?.status === "pending" && <p>운영팀 검토 중입니다.</p>}
      {verification?.status === "approved" && <p>교원 인증이 승인됐습니다.</p>}
      {verification?.status === "rejected" && <p>반려 사유 {verification.rejection_reason}</p>}
      {canApply && <form action={submitCertificate}>
        <label>교원증명서 <input name="certificate" type="file" accept="application/pdf" required /></label>
        <button>{verification ? "다시 신청" : "인증 신청"}</button>
      </form>}
    </main>
  );
}
