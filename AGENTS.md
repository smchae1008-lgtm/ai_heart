# AI 마음이 프로젝트에서 Codex 사용하기


## 프로젝트와 환경


- GitHub 저장소는 `smchae1008-lgtm/ai_heart`입니다. 기본 브랜치는 `main`입니다.
- 운영 Vercel 팀은 `ai-heart`, 프로젝트는 밑줄이 있는 `ai_heart`입니다. 운영 주소는 https://www.ai-heart.co.kr/ 입니다. 배포와 환경 변수 변경은 이 프로젝트를 대상으로 합니다.
- 운영 Supabase 프로젝트는 `ai_마음이` (`rikwramzpveuofxdlzha`)입니다. Vercel Production에는 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 사용합니다. 개발과 Preview에서 운영 데이터로 테스트하지 않습니다.
- 첫 화면은 `app/page.tsx`에서 실제 대시보드와 학부모 입장 방법을 안내합니다. DB 연결 확인 스크립트와 앱 기능의 DB 연동은 각각 검증합니다.


## 작업 순서


1. 작업을 시작하면 `git status`와 `git fetch origin`으로 작업 상태와 최신 `main`을 확인합니다. 작업 트리가 깨끗하면 `git switch main`과 `git pull --ff-only`로 업데이트한 뒤 작업 브랜치를 만듭니다. 팀원의 변경이 있으면 보존하고 필요하면 별도 worktree에서 최신 `origin/main`을 기준으로 작업합니다. 요구사항은 `docs/prd.md`, 구현 순서는 `docs/build-plan.md`, 로컬 설정은 `docs/local-development.md`를 참고합니다.
2. Node.js 24에서 처음 설치할 때 `npm ci`, 로컬 확인에 `npm run dev`, PR 전에는 `npm run build`를 실행합니다. 수정한 기능을 직접 확인하고 결과를 한국어로 짧게 알려줍니다.
3. Codex가 구현, 검사, 커밋, 푸시, PR 작성과 Preview 확인까지 진행합니다. 팀이 병합을 맡겼고 필수 검사와 저장소 규칙을 충족하면 PR을 병합합니다. `main`으로 시작된 Vercel 운영 배포가 `Ready`가 될 때까지 확인하고 운영 URL에서 변경 기능을 확인합니다. 실패하면 빌드·런타임 로그를 읽고 수정한 뒤 다시 확인합니다.
4. DB 변경은 저장소의 `supabase/migrations/`에 SQL로 기록하고 개발 환경에서 검증합니다. 운영 적용, 프로젝트 삭제, 계정 권한 변경은 대상과 영향을 설명하고 팀의 결정을 받습니다.
5. 로컬 설정은 `.env.local`에 둡니다. 비밀번호·토큰·서버용 Supabase 키는 코드, GitHub, 채팅에 남기지 않습니다. 서버용 키를 `NEXT_PUBLIC_`에 넣지 않습니다.


## Vercel 403 확인 순서


- 먼저 실패한 작업이 MCP, CLI, GitHub 자동 배포, 배포 URL 열기 중 무엇인지 확인하고 오류 문구를 기록합니다. 토큰은 가립니다.
- MCP면 브라우저의 로그인과 별도로 팀원의 Codex OAuth 연결이 Vercel 팀 `ai-heart`에 접근 가능한지 확인합니다. 프로젝트 MCP 주소는 `https://mcp.vercel.com/ai-heart/ai_heart`입니다. CLI면 `vercel whoami`와 로컬 `.vercel/project.json`의 팀·프로젝트 연결을 확인합니다.
- GitHub 자동 배포면 운영 프로젝트의 Git 연결과 해당 커밋의 체크를 확인합니다. Preview 주소라면 접근 권한을 확인합니다. 403을 해결하기 위해 저장소 공개 범위나 배포 보호를 낮추지 않습니다.
- 로그인이나 이메일 인증이 필요하면 팀원이 브라우저에서 직접 처리할 화면과 클릭 위치를 알려줍니다. 그 외 진행 가능한 점검은 Codex가 계속 수행합니다.

## Supabase 변경을 배포하는 순서

- 대상 프로젝트와 적용된 마이그레이션을 확인합니다. 스키마 변경은 개발 환경에서 적용 순서와 권한을 검증하고 운영 반영 시점은 팀이 승인한 배포 범위를 따릅니다. 기존 운영 배포와 호환되는 마이그레이션은 이를 사용하는 앱을 배포하기 전에 적용하고 적용 이력과 변경 기능을 확인합니다.
- `npm run check:supabase`는 공개 키로 Auth 설정 API에 접속해 URL과 키를 검증합니다. 실제 로그인, 역할별 데이터 접근과 RLS는 해당 기능을 구현할 때 테스트 계정으로 확인합니다.
- 권한이 있는 작업과 복구 가능한 실패 처리는 Codex가 끝까지 진행합니다. 인증, 접근 승인, 필수 리뷰 또는 운영 데이터에 영향이 있는 결정이 필요할 때 팀원이 수행할 단계와 이유를 알려줍니다.
