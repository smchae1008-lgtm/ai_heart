import { redirect } from "next/navigation";
import { verificationContext } from "../../lib/verification";
import { joinClassByCode } from "../class/[id]/actions";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  if (!await verificationContext()) redirect("/login?next=%2Fjoin");
  const { result } = await searchParams;
  return (
    <main>
      <h1>학급 코드로 입장</h1>
      <p>담임 선생님에게 받은 학급 코드를 입력해 주세요.</p>
      <form action={joinClassByCode}>
        <label>학급 코드
          <input name="code" required maxLength={36} autoComplete="off" spellCheck={false}
            aria-invalid={result === "invalid" || undefined}
            aria-describedby={result === "invalid" ? "join-error" : undefined} />
        </label>
        {result === "invalid" && <p id="join-error" role="alert">이 코드로 입장할 수 없어요. 최신 코드와 학급 운영 기간을 확인해 주세요.</p>}
        <button>입장</button>
      </form>
    </main>
  );
}
