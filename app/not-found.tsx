import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>페이지를 찾을 수 없어요</h1>
      <p>공유받은 학급 주소를 확인하거나 AI 마음이 홈에서 다시 시작해 주세요.</p>
      <nav aria-label="이동 메뉴">
        <ul>
          <li><Link href="/">AI 마음이 홈</Link></li>
          <li><Link href="/login">로그인</Link></li>
        </ul>
      </nav>
    </main>
  );
}
