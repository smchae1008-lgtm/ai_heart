import { redirect } from "next/navigation";
import { connection } from "next/server";
import { verificationContext } from "../../lib/verification";
import { JoinForm } from "./join-form";

export default async function JoinPage() {
  await connection();
  if (!await verificationContext()) redirect("/login?next=%2Fjoin");
  return (
    <main>
      <h1>학급 코드로 입장</h1>
      <p>담임 선생님에게 받은 학급 코드를 입력해 주세요.</p>
      <JoinForm />
    </main>
  );
}
