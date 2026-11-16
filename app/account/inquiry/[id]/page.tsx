import { notFound, redirect } from "next/navigation";
import { verificationContext } from "../../../../lib/verification";
import { ReplyForm } from "./reply-form";

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const { id } = await params;
  const { data } = await context.admin.from("classroom_inquiries")
    .select("message,summary,teacher_reply,classroom_id,code_version,classrooms!inner(teacher_id)").eq("id", id)
    .eq("classrooms.teacher_id", context.user.id).neq("category", "simple").maybeSingle();
  if (!data) notFound();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" }).format(new Date());
  const classroom = data.teacher_reply ? null : await context.admin.from("classrooms").select("id")
    .eq("id", data.classroom_id).eq("teacher_id", context.user.id).eq("published", true).eq("deleting", false)
    .eq("code_version", data.code_version).lte("starts_on", today).gte("ends_on", today).maybeSingle();
  return <main>
    <h1>문의 원문</h1>
    <p>{data.summary}</p>
    <p style={{ whiteSpace: "pre-wrap" }}>{data.message}</p>
    <section aria-label="선생님 답변">
      <h2>선생님 답변</h2>
      {data.teacher_reply
        ? <p className="teacher-reply-text">{data.teacher_reply}</p>
        : classroom?.data ? <ReplyForm inquiryId={id} />
          : <p>운영 중이며 현재 코드로 입장한 학급의 문의에 답변을 보낼 수 있어요.</p>}
    </section>
    <a href="/account">받은함으로 돌아가기</a>
  </main>;
}
