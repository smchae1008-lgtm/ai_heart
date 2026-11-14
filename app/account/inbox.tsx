import { verificationContext } from "../../lib/verification";

const priorities = { high: "상", medium: "중", low: "하" } as const;

export async function Inbox({ classroomId }: { classroomId: string }) {
  const context = await verificationContext();
  if (!context) return null;
  const { data: owner } = await context.admin.from("classrooms").select("id")
    .eq("id", classroomId).eq("teacher_id", context.user.id).maybeSingle();
  if (!owner) return null;
  const { data, error } = await context.admin.from("classroom_inquiries")
    .select("id,category,priority,summary,notify_at")
    .eq("classroom_id", classroomId).neq("category", "simple").order("created_at", { ascending: false });
  const now = Date.now();
  const alerts = data?.filter(row => row.notify_at && Date.parse(row.notify_at) <= now);
  return <section aria-label="받은 문의">
    <h4>받은 문의</h4>
    {error && <p role="alert">문의 목록을 불러오지 못했습니다.</p>}
    {!!alerts?.length && <ul aria-label="확인 가능한 알림">{alerts.map(row =>
      <li key={row.id}>긴급도 {priorities[row.priority as keyof typeof priorities]}
        {row.priority === "high" && " · 안전 확인 필요"}</li>
    )}</ul>}
    {data?.length === 0 && <p>접수된 문의가 없습니다.</p>}
    {data?.map(row => <article key={row.id}>
      <p>{row.category === "abuse" ? "악성민원 · 주의" : "일반민원"} · 긴급도 {priorities[row.priority as keyof typeof priorities]}</p>
      <p>{row.summary}</p>
      <a href={`/account/inquiry/${row.id}`}>문의 원문 보기</a>
    </article>)}
  </section>;
}
