import { redirect } from "next/navigation";
import { verificationContext } from "../../lib/verification";
import { reviewCertificate, retryCertificateDeletion } from "./actions";

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const context = await verificationContext();
  if (!context?.operator) redirect("/account");
  const { result } = await searchParams;
  const { data, error } = await context.admin.from("teacher_verifications")
    .select("id, teacher_id, school_year, status").not("certificate_path", "is", null).order("created_at");

  return (
    <main>
      <h1>교원 인증 검토</h1>
      {error && <p role="alert">신청 목록을 불러오지 못했습니다.</p>}
      {result && <p role="alert">{result === "cleanup" ? "심사 결과는 저장됐습니다. 증명서 삭제를 다시 시도해 주세요." : "처리하지 못했습니다. 입력과 목록을 확인해 주세요."}</p>}
      {data?.length === 0 && <p>검토 대기 중인 신청이 없습니다.</p>}
      {data?.map(request => request.status !== "pending" ? (
        <form key={request.id} action={retryCertificateDeletion}>
          <input type="hidden" name="id" value={request.id} />
          <button>{request.school_year}학년도 증명서 삭제 재시도 ({request.teacher_id})</button>
        </form>
      ) : (
        <section key={request.id}>
          <h2>{request.school_year}학년도 신청</h2>
          <p>{request.teacher_id}</p>
          <a href={`/operations/certificate/${request.id}`}>교원증명서 다운로드</a>
          <form action={reviewCertificate}>
            <input type="hidden" name="id" value={request.id} />
            <label>반려 사유 <input name="reason" maxLength={500} /></label>
            <button name="decision" value="approved">승인</button>
            <button name="decision" value="rejected">반려</button>
          </form>
        </section>
      ))}
    </main>
  );
}
