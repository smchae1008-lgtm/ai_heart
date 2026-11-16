# Phase 0 로컬 실행


저장소 루트에서 Node.js 24로 실행한다.


```powershell
npm ci
npm run dev
npm run build
```


개발 서버의 기본 주소는 `http://localhost:3000`이다. 첫 화면에서 대시보드를 열 수 있다. 예시 데이터 프로토타입은 `/prototype/index.html`에서 검토할 수 있다.


Supabase 연결을 확인하려면 프로젝트의 Connect 화면에서 Publishable key를 복사하고, `.env.example`에 표시된 두 변수를 기존 `.env.local`에 추가한다. 기존 OpenAI 설정을 보존한다.


```powershell
npm run check:supabase
```


이 명령은 공개 키로 Supabase Auth 설정 API에 읽기 요청을 보내고 HTTP 상태를 출력한다. 성공 응답은 프로젝트 URL과 공개 키가 유효함을 확인한다. 사용자 로그인, 앱 테이블 접근과 RLS 정책은 해당 기능을 구현한 이후 검증한다.

## 역할별 개발 검수

Docker 엔진을 실행한 뒤 저장소 루트에서 Supabase CLI로 개발용 스택을 시작한다.

```powershell
supabase start
supabase migration up --local
```

CLI에 표시되는 로컬 API URL, Publishable key, Secret key를 `.env.local`의 해당 변수에 넣는다. 로컬 SMTP 화면은 http://127.0.0.1:54324 에서 열 수 있다. 가상 계정으로 인증 코드를 요청하고 SMTP 화면에서 받은 코드를 앱에 입력한다.

```powershell
npm run check:supabase
npm run test:db
npm run dev
```

[첫 버전 인수인계](first-version-handoff.md)의 절차로 교사, 학부모, 운영팀 흐름을 확인한다. 앱의 AI 분류까지 테스트할 때는 사용 가능한 개발 모델과 키를 지정한다. 교원증명서와 학사일정은 가상 자료를 사용한다.
