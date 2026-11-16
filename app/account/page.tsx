import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseClient } from "../../lib/supabase/server";
import { schoolYear } from "../../lib/verification";
import { submitCertificate } from "./actions";
import { ClassForm, type Classroom } from "./class-form";
import { deleteClass, rotateCode } from "./classes";
import { uploadMaterial } from "./materials";
import { Inbox } from "./inbox";
import { verificationContext } from "../../lib/verification";

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
  const context = await verificationContext();
  const classes = context && await context.admin.from("classrooms").select("*")
    .eq("teacher_id", account.sub).order("created_at", { ascending: false });
  const classrooms = await Promise.all((classes?.data ?? []).map(async row => {
    const admissions = await context!.admin.from("classroom_admissions").select("parent_id", { count: "exact", head: true })
      .eq("classroom_id", row.id).eq("code_version", row.code_version);
    const materials = await context!.admin.from("classroom_materials").select("id,name")
      .eq("classroom_id", row.id).order("created_at", { ascending: false });
    return { classroom: row as Classroom, count: admissions.count, materials: materials.data ?? [] };
  }));

  return (
    <main className="teacher-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>내 계정</h1>
          <p>{account.email}</p>
        </div>
        {account.app_metadata?.maeumi_role === "operator" && <a href="/operations">교원 인증 검토</a>}
      </header>
      <section className="dashboard-panel" aria-label="교원 인증">
        <h2>{year}학년도 교원 인증</h2>
        {error && <p role="alert">인증 상태를 불러오지 못했습니다.</p>}
        {submission && <p role="alert">{submission === "delete-confirm" ? "학급 기록 삭제에 동의해 주세요."
          : submission === "delete-failed" ? "학급 삭제를 시작하지 못했습니다."
          : submission === "delete-retry" ? "새 문의는 차단됐습니다. 남은 학급 기록 삭제를 다시 시도해 주세요."
          : submission === "class-denied" ? "이번 학년도 교원 인증을 먼저 승인받아 주세요."
          : submission === "material-invalid" ? "4 MB 이하의 텍스트가 포함된 학사일정 PDF를 선택해 주세요."
          : submission === "material-failed" ? "학사일정 PDF를 저장하지 못했습니다."
          : submission === "class-invalid" ? "학급 설정을 저장하지 못했습니다. 기간, 상담 시간, 공식 문의처를 확인해 주세요."
          : submission === "invalid"
          ? "4 MB 이하의 PDF 증명서를 선택해 주세요."
          : "증명서를 제출하지 못했습니다. 잠시 후 다시 시도해 주세요."}</p>}
        {verification?.status === "pending" && <p>운영팀 검토 중입니다.</p>}
        {verification?.status === "approved" && <p>교원 인증이 승인됐습니다.</p>}
        {verification?.status === "rejected" && <p>반려 사유 {verification.rejection_reason}</p>}
        {canApply && <form action={submitCertificate}>
          <label>교원증명서 <input name="certificate" type="file" accept="application/pdf" required /></label>
          <button>{verification ? "다시 신청" : "인증 신청"}</button>
        </form>}
      </section>
      <h2>내 학급</h2>
      {classes?.error && <p role="alert">학급을 불러오지 못했습니다.</p>}
      {context && verification?.status === "approved" && <details className="dashboard-create"><summary>새 학급 개설</summary><ClassForm /></details>}
      {classrooms.map(({ classroom, count, materials }) => (
        <section key={classroom.id} className="dashboard-panel">
          <header className="dashboard-class-header">
            <div>
              <h3>{classroom.name}</h3>
              <p>현재 코드 입장 계정 {count ?? "확인 불가"}</p>
            </div>
            {classroom.published && <a href={"/class/" + classroom.id}>학부모 링크 열기</a>}
          </header>
          <p className="dashboard-class-code">학급 코드 <code>{classroom.join_code}</code></p>
          {!classroom.deleting && <><form action={rotateCode}>
            <input type="hidden" name="id" value={classroom.id} />
            <button>코드 재발급</button>
          </form>
          <details><summary>학급 설정</summary><ClassForm classroom={classroom} /></details>
          <details>
            <summary>학사일정 PDF</summary>
            {materials.length > 0 && <ul className="dashboard-materials">{materials.map(material => <li key={material.id}>{material.name}</li>)}</ul>}
            <form action={uploadMaterial}>
              <input type="hidden" name="id" value={classroom.id} />
              <label>학사일정 PDF <input type="file" name="material" accept="application/pdf" required /></label>
              <button>PDF 등록</button>
            </form>
          </details>
          <Inbox classroomId={classroom.id} /></>}
          <details>
            <summary>{classroom.deleting ? "학급 삭제 재시도" : "학급 삭제"}</summary>
            <form action={deleteClass}>
              <input type="hidden" name="id" value={classroom.id} />
              <label><input type="checkbox" name="confirm" required /> 이 학급의 PDF, 문의, 입장 기록을 삭제합니다.</label>
              <button>학급 데이터 삭제</button>
            </form>
          </details>
        </section>
      ))}
    </main>
  );
}
