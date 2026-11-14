# Phase 0 로컬 실행


저장소 루트에서 Node.js 24로 실행한다.


```powershell
npm ci
npm run dev
npm run build
```


개발 서버의 기본 주소는 `http://localhost:3000`이다. 첫 화면은 `public/prototype/`에 있는 기존 프로토타입을 표시한다.


Supabase 연결을 확인하려면 프로젝트의 Connect 화면에서 Publishable key를 복사하고, `.env.example`에 표시된 두 변수를 기존 `.env.local`에 추가한다. 기존 OpenAI 설정을 보존한다.


```powershell
npm run check:supabase
```


이 명령은 공개 키로 Supabase Auth 설정 API에 읽기 요청을 보내고 HTTP 상태를 출력한다. 성공 응답은 프로젝트 URL과 공개 키가 유효함을 확인한다. 사용자 로그인, 앱 테이블 접근과 RLS 정책은 해당 기능을 구현한 이후 검증한다.
