import { notFound, redirect } from "next/navigation";
import { verificationContext } from "../../../../lib/verification";

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await verificationContext();
  if (!context) redirect("/login");
  const { id } = await params;
  const { data } = await context.admin.from("classroom_inquiries")
    .select("message,summary,classrooms!inner(teacher_id)").eq("id", id)
    .eq("classrooms.teacher_id", context.user.id).neq("category", "simple").maybeSingle();
  if (!data) notFound();
  return <main>
    <h1>문의 원문</h1>
    <p>{data.summary}</p>
    <p style={{ whiteSpace: "pre-wrap" }}>{data.message}</p>
    <a href="/account">받은함으로 돌아가기</a>
  </main>;
}
