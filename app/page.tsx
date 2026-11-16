export default function HomePage() {
  return (
    <main className="home">
      <header className="home-header">
        <div className="home-header-inner">
          <h1><span aria-hidden="true">♡</span> AI 마음이</h1>
          <nav aria-label="서비스 메뉴"><a href="/login">교사·운영팀 로그인 <span aria-hidden="true">→</span></a></nav>
        </div>
      </header>
      <iframe src="/prototype/index.html" title="AI 마음이 학급 소통 프로토타입" />
    </main>
  );
}
