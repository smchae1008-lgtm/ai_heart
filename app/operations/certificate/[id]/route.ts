import { bucket, verificationContext } from "../../../../lib/verification";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await verificationContext();
  if (!context?.operator) return new Response(null, { status: 403 });
  const { id } = await params;
  const { data } = await context.admin.from("teacher_verifications")
    .select("certificate_path").eq("id", id).eq("status", "pending").maybeSingle();
  if (!data?.certificate_path) return new Response(null, { status: 404 });
  const { data: file, error } = await context.admin.storage.from(bucket).download(data.certificate_path);
  if (error || !file) return new Response(null, { status: 404 });
  return new Response(file, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="teacher-certificate.pdf"',
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
