import { notFound, redirect } from "next/navigation";
import { verificationContext } from "../../../lib/verification";
import { joinClass } from "./actions";

export default async function ParentClassPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }>;
}) {
  const { id } = await params;
  const context = await verificationContext();
  if (!context) redirect("/login?next=" + encodeURIComponent("/class/" + id));
  const { data: classroom } = await context.admin.from("classrooms")
    .select("name,greeting,starts_on,ends_on,code_version").eq("id", id).eq("published", true).maybeSingle();
  if (!classroom) notFound();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" }).format(new Date());
  if (today < classroom.starts_on || today > classroom.ends_on) return <main><h1>문의 접수 기간이 아닙니다</h1></main>;
  const { data: admission } = await context.admin.from("classroom_admissions").select("code_version")
    .eq("classroom_id", id).eq("parent_id", context.user.id).maybeSingle();
  if (admission?.code_version === classroom.code_version) {
    return <main><h1>{classroom.name}</h1><p>{classroom.greeting}</p></main>;
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
