import { notFound, redirect } from "next/navigation";
import { verificationContext } from "../../../lib/verification";
import { randomUUID } from "node:crypto";
import { joinClass, sendInquiry } from "./actions";
import { SendButton } from "./send-button";

export default async function ParentClassPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }>;
}) {
  const { id } = await params;
  const context = await verificationContext();
  if (!context) redirect("/login?next=" + encodeURIComponent("/class/" + id));
  const { data: classroom } = await context.admin.from("classrooms")
    .select("name,greeting,official_contact,starts_on,ends_on,code_version").eq("id", id).eq("published", true).maybeSingle();
  if (!classroom) notFound();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" }).format(new Date());
  if (today < classroom.starts_on || today > classroom.ends_on) return <main><h1>문의 접수 기간이 아닙니다</h1></main>;
  const { data: admission } = await context.admin.from("classroom_admissions").select("code_version")
    .eq("classroom_id", id).eq("parent_id", context.user.id).maybeSingle();
  if (admission?.code_version === classroom.code_version) {
    const { result } = await searchParams;
    const { data: messages, error } = await context.admin.from("classroom_inquiries")
      .select("id,message,reply,teacher_reply,category,priority").eq("classroom_id", id).eq("parent_id", context.user.id)
      .eq("code_version", classroom.code_version).order("created_at", { ascending: false }).limit(50);
    const { count } = await context.admin.from("classroom_inquiries").select("id", { count: "exact", head: true })
      .eq("classroom_id", id).eq("parent_id", context.user.id).eq("code_version", classroom.code_version).eq("category", "abuse");
    const closed = (count ?? 0) >= 2;
    return <main className="class-conversation">
      <h1>{classroom.name}</h1><p>{classroom.greeting}</p>
      {result && <p role="alert">문의를 접수하지 못했습니다. 입장 상태와 문의 내용을 확인해 주세요.</p>}
      {error && <p role="alert">문의 기록을 불러오지 못했습니다.</p>}
      {messages?.reverse().map(item => <article key={item.id}>
        <div className="inquiry-message">
          <strong>내 문의</strong>
          <p>{item.message}</p>
        </div>
        <div className="inquiry-message inquiry-reply">
          <strong>AI 마음이</strong>
          <p>{item.reply}</p>
        </div>
        {item.teacher_reply && <div className="inquiry-message inquiry-teacher-reply">
          <strong>선생님 답변</strong>
          <p>{item.teacher_reply}</p>
        </div>}
        {(item.category === "abuse" || item.priority === "high") && <p>학교 공식 문의처 · {classroom.official_contact}</p>}
      </article>)}
      {closed && <p>대화가 종료되었습니다. 학교 공식 문의처 · {classroom.official_contact}</p>}
      {!closed && <form action={sendInquiry.bind(null, id, classroom.code_version, randomUUID())}>
        <label>문의 내용
          <textarea name="message" rows={4} required maxLength={2000} aria-describedby="inquiry-hint"
            placeholder="예: 다음 현장학습에 무엇을 준비하면 되나요?" />
        </label>
        <p id="inquiry-hint">일정, 준비물, 상담 요청 등을 자유롭게 적어 주세요. 교사 확인이 필요한 문의는 받은함으로 전달돼요.</p>
        <SendButton />
      </form>}
    </main>;
  }
  const { result } = await searchParams;
  return (
    <main>
      <h1>{classroom.name} 입장</h1>
      {result && <p role="alert">학급 코드를 확인해 주세요.</p>}
      <form action={joinClass.bind(null, id)}>
        <label>학급 코드 <input name="code" required maxLength={36} /></label>
        <button>입장</button>
      </form>
    </main>
  );
}
