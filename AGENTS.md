# AI 마음이 프로젝트에서 Codex 사용하기

## 프로젝트와 환경

- GitHub 저장소는 `smchae1008-lgtm/ai_heart`입니다. 기본 브랜치는 `main`입니다.
- 운영 Vercel 팀은 `ai-heart`, 프로젝트는 밑줄이 있는 `ai_heart`입니다. 운영 주소는 https://www.ai-heart.co.kr/ 입니다. 하이픈이 있는 `ai-heart` 프로젝트는 기존 공유 링크 확인 중입니다.
- 운영 Supabase 프로젝트는 `ai_마음이` (`rikwramzpveuofxdlzha`)입니다. Vercel Production에는 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 사용합니다. 개발과 Preview에서 운영 데이터로 테스트하지 않습니다.
- 현재 첫 화면은 `app/page.tsx`에서 `public/prototype/index.html`을 표시합니다. DB 연결 확인 스크립트와 앱 기능의 DB 연동은 각각 검증합니다.

## 작업 순서

1. 작업을 시작하면 `git status`로 현재 브랜치와 팀원의 미커밋 변경을 확인합니다. 요구사항은 `docs/prd.md`, 구현 순서는 `docs/build-plan.md`, 로컬 설정은 `docs/local-development.md`를 참고합니다.
2. Node.js 24에서 처음 설치할 때 `npm ci`, 로컬 확인에 `npm run dev`, PR 전에는 `npm run build`를 실행합니다. 수정한 기능을 직접 확인하고 결과를 한국어로 짧게 알려줍니다.
3. 코드 변경은 작업 브랜치와 PR로 남깁니다. 팀이 PR을 검토하고 `main`에 병합하면 Vercel 운영 배포가 시작됩니다. 배포 후 운영 주소가 열리는지 확인합니다.
4. DB 변경은 저장소의 `supabase/migrations/`에 SQL로 기록하고 개발 환경에서 검증합니다. 운영 적용, 프로젝트 삭제, 계정 권한 변경은 대상과 영향을 설명하고 팀의 결정을 받습니다.
5. 로컬 설정은 `.env.local`에 둡니다. 비밀번호·토큰·서버용 Supabase 키는 코드, GitHub, 채팅에 남기지 않습니다. 서버용 키를 `NEXT_PUBLIC_`에 넣지 않습니다.

## Vercel 403 확인 순서

- 먼저 실패한 작업이 MCP, CLI, GitHub 자동 배포, 배포 URL 열기 중 무엇인지 확인하고 오류 문구를 기록합니다. 토큰은 가립니다.
- MCP면 브라우저의 로그인과 별도로 팀원의 Codex OAuth 연결이 Vercel 팀 `ai-heart`에 접근 가능한지 확인합니다. 프로젝트 MCP 주소는 `https://mcp.vercel.com/ai-heart/ai_heart`입니다. CLI면 `vercel whoami`와 로컬 `.vercel/project.json`의 팀·프로젝트 연결을 확인합니다.
- GitHub 자동 배포면 운영 프로젝트의 Git 연결과 해당 커밋의 체크를 확인합니다. Preview 주소라면 접근 권한을 확인합니다. 403을 해결하기 위해 저장소 공개 범위나 배포 보호를 낮추지 않습니다.
- 로그인이나 이메일 인증이 필요하면 팀원이 브라우저에서 직접 처리할 화면과 클릭 위치를 알려줍니다. 그 외 진행 가능한 점검은 Codex가 계속 수행합니다.
