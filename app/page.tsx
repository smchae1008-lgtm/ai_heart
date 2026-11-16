export default function HomePage() {
  return (
    <main className="home">
      <header className="home-header">
        <div className="home-header-inner">
          <p className="home-brand"><span aria-hidden="true">♡</span> AI 마음이</p>
        </div>
      </header>
      <div className="service-home">
        <div className="service-intro">
          <h1>학급 소통을 더 편하게</h1>
          <p>학사일정과 준비물은 학급 챗봇에서 확인하고, 선생님이 확인해야 할 문의는 받은함으로 전달해요.</p>
        </div>
        <div className="service-entry">
          <section aria-labelledby="teacher-entry">
            <h2 id="teacher-entry">교사·운영팀</h2>
            <p>이메일 인증으로 로그인해 교원 인증, 학급 개설, 학사일정 PDF 등록, 받은 문의 확인을 진행하세요.</p>
            <a href="/account" className="service-action">대시보드 열기 <span aria-hidden="true">→</span></a>
          </section>
          <section aria-labelledby="parent-entry">
            <h2 id="parent-entry">학부모</h2>
            <p>담임 선생님에게 받은 학급 링크를 열어 주세요. 이메일 로그인 후 학급 코드를 입력하면 질문을 보낼 수 있어요.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
