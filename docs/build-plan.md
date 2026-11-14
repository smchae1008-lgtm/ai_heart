# AI 마음이 구축 계획

2026년 11월 12일 기준. [PRD](prd.md), [요구사항정의서](requirements.md), [기능명세서](functional-spec.md), [디자인 시스템](design-system.md)을 구현 기준으로 사용한다.

## 단계별 구축

| 단계 | 구축 범위 | 완료 기준 |
| --- | --- | --- |
| 0. 배포 기반 | GitHub main에 실행 가능한 Next.js·TypeScript 앱을 올리고 Vercel Preview에 연결한다. Supabase 개발 환경과 환경 변수를 설정한다. | Preview URL이 열리고 서버에서 개발 DB 연결을 확인한다. 실제 문의 환경의 키와 데이터는 분리한다. |
| 1. 인증과 권한 | Supabase 이메일 OTP, 테스트 발송용 SMTP, 교사·학부모·운영팀 역할, 교원증명서 비공개 검토·승인·반려·파일 삭제, 3월 재인증을 구현한다. | 승인 전 개설이 차단되고 다른 학급의 기록과 증명서에 접근할 수 없다. 반려 사유를 보고 재신청할 수 있다. |
| 2. 학급 개설과 입장 | 기간, 요일별 상담 시간, 공식 문의처, 첫인사 3종·편집, 말투 5단계·미리보기, 링크·코드 발급과 재발급, 고유 입장 계정 수를 구현한다. | 공식 문의처가 없으면 공개가 차단된다. 재발급 후 이전 코드 및 접근 권한으로 접수할 수 없다. 종료 학급은 새 접수만 차단된다. |
| 3. PDF와 AI | 학사일정 PDF 텍스트를 페이지 단위로 추출하고 해당 학급 자료만 검색한다. 모델이 문의 유형·요약·긴급도·근거 ID를 구조화해 반환하고 서버가 근거와 규칙을 검증한다. | PDF에 있는 일정·준비물만 답한다. 근거 부족은 일반민원으로 저장한 뒤 접수를 안내한다. 타 학급 자료, 잘못된 근거 ID, PDF 안 지시문은 답변 근거로 쓰이지 않는다. |
| 4. 문의 접수와 받은함 | 원문·요약·긴급도 저장, 주의 표기, 첫 경고와 재작성 1회, 재감지 종료와 공식 문의처 표시, 상담 시간 기반 알림, 학급 삭제를 구현한다. | 담당 교사만 원문을 열람한다. 안전 확인이 시급한 건은 즉시, 나머지는 상담 시간 규칙대로 표시된다. 중복 요청에 접수·알림이 중복되지 않으며 삭제 시 해당 학급의 DB와 Storage 자료가 제거된다. |
| 5. 테스트와 운영 판단 | 11월 17일 교사 테스트에서 OTP·학급 설정·PDF·예시 문의·원문·알림을 검증하고 후기를 수집한다. | 완료한 흐름과 결함을 기록한다. 실제 문의 운영 전 데이터 처리·제공사 보관 조건, 사용자 안내, 접근 및 삭제 검증을 확인한다. |

11월 17일까지는 예시 PDF와 가상 민원으로 전체 흐름을 우선 검증한다. 외부 승인이나 AI 연결이 늦어지면 기존 HTML 프로토타입으로 화면 사용성을 검증하고, 실제 연결 검증 항목은 별도 기록한다. 교사 답장, 학급별 금칙어, 문자·이메일 민원 알림은 첫 테스트 범위에서 제외한다.

## 구현 구조

- Vercel에서 웹과 서버 API를 실행한다. Supabase Auth, Postgres, 비공개 Storage로 인증·학급 자료·민원 원문을 관리한다. 스키마 변경은 저장소의 마이그레이션으로 추적한다.
- 운영팀 승인 권한과 학급 소유권을 서버와 RLS에서 검사한다. 교원증명서는 AI 입력에 포함하지 않는다. PDF 전체와 학생·학부모 식별정보 대신 해당 질문에 필요한 발췌와 필요한 최소한의 맥락을 모델에 보낸다.
- 모델은 분류 및 요약 후보를 반환한다. 접수 완료, 경고·종료, 공식 문의처, 알림 시각은 서버 상태와 정책에 따라 결정한다. 모델 타임아웃이나 스키마 검증 실패 시 추측 답변을 피하고 교사 확인 흐름으로 넘긴다. 안전 가능성이 있는 분류 실패는 일반 대기열로 자동 강등하지 않는다.
- 초기에는 텍스트가 포함된 PDF만 지원하고 스캔본은 처리 불가 상태를 명시한다. 파일과 추출본은 학급 단위로 삭제한다. 앱 로그는 요청 ID·시간·사용량 위주로 남긴다.

## AI API 비교

표준 온라인 텍스트 요청의 입력/출력 100만 토큰당 USD. 캐시, 배치, 검색·저장 비용은 제외한다. 문의 1,000건에 건당 입력 1,500·출력 250토큰을 가정한 비교이며 실제 사용량은 측정한다.

| 후보 | 입력 / 출력 | 예시 1,000건 | 적용 판단 |
| --- | --- | --- | --- |
| OpenAI GPT-5.6 Luna | $0.20 / $1.20 | $0.60 | Responses API와 Structured Outputs를 지원한다. 분류·요약·근거 ID를 한 응답 스키마로 처리하는 첫 후보. [모델](https://developers.openai.com/api/docs/models/gpt-5.6-luna) |
| Anthropic Claude Haiku 5.5 | $0.10 / $0.50 | $0.28 | 짧은 입력 구간의 표준 요금. 분류·추출용 저비용 비교군이다. Claude 기본 인용과 strict JSON을 한 요청에 결합할 수 없어 근거 ID를 자체 스키마로 관리한다. [요금](https://platform.claude.com/docs/en/about-claude/pricing) · [구조화 출력](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) |
| Google Gemini 3.5 Flash-Lite | $0.30 / $2.50 | $1.08 | 구조화 출력을 지원한다. 문서 입력을 직접 다루는 비교군으로 활용할 수 있다. 실제 문의 검토 시 유료 서비스 데이터 처리 조건을 확인한다. [요금](https://ai.google.dev/gemini-api/docs/pricing) · [모델](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) · [약관](https://ai.google.dev/gemini-api/docs/terms) |

GPT-5.6 Luna부터 연동한다. 한국어 민원 데이터에서 성능 우위는 아직 실측하지 않았다. 같은 가상 사례로 분류 일치율, 긴급 안전 누락, 욕설 인용 오탐, PDF 근거 일치, 지연과 비용을 비교한다. 안전 확인이 필요한 사례를 빠뜨리거나 문서에 없는 내용을 확정적으로 답하는 경우에는 해당 흐름을 실제 문의에 사용하기 전에 수정하고 재검증한다.

OpenAI Responses API는 `store: false`로 호출하되 기본 오남용 모니터링 보관과 별개임을 고려한다. Claude도 표준 API 보관 기간과 예외가 있다. 교사가 앱에서 삭제하는 범위와 공급자 측 데이터 처리를 운영 전에 구분해 확인한다. [OpenAI 데이터 제어](https://developers.openai.com/api/docs/guides/your-data) · [Anthropic 보관 안내](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)

## 키와 연결

- Vercel MCP는 프로젝트·배포·로그 확인에 사용한다. Supabase MCP는 지정 프로젝트의 읽기 전용 DB 점검에 사용한다. MCP OAuth는 개발 도구 연결이고 서비스의 API 키와 별도다. [Vercel MCP](https://vercel.com/docs/agent-resources/vercel-mcp) · [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)
- 앱의 OpenAI 키는 팀 API 프로젝트에서 발급하고 Vercel 서버 환경 변수 `OPENAI_API_KEY`에 등록한다. 개발 키는 실제 배포에 사용하는 로컬 앱의 gitignore 처리된 `.env.local`에 둔다. [OpenAI API 시작](https://developers.openai.com/api/docs/quickstart) · [Vercel 환경 변수](https://vercel.com/docs/environment-variables/managing-environment-variables)
