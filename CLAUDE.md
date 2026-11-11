# 하루 (haru)

아이·청소년이 반려 캐릭터를 돌보는 행동(쓰다듬기, 밥 주기, 놀이, 대화)으로 마음을 살피는 앱.
웹앱 + API 서버 + Capacitor 네이티브 앱(iOS/Android)이 한 저장소에 있다.

**지금 할 일은 출시다. 남은 단계와 현재 상태는 `docs/LAUNCH.md`에 있다. 먼저 읽을 것.**

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm install` | 의존성 설치 (Node 22.13 이상) |
| `npm run dev` | API(:8787) + 웹(:5173). DB는 내장 PGlite가 `./data`에 생김 |
| `npm test` | 서버 단위·통합 테스트 (내장 Postgres로 실제 API 전체 흐름) |
| `npm run build:vercel` | Vercel 배포용 빌드(`.vercel/output`) |
| `npm run native:sync` | 네이티브용 웹 빌드 후 `web/android`, `web/ios`에 반영 |

## 구조

- `server/src/api.ts` 라우트, `analysis.ts` 행동 기반 정서 분석, `llm.ts` Claude 대화(+내장 답변), `safety.ts` 위험 감지,
  `db.ts` DB 접속과 스키마(운영: `DATABASE_URL`의 Postgres, 개발·테스트: 내장 PGlite)
- `web/src` React + Vite. `screens/` 화면, `components/Character.tsx` 캐릭터 동작
- 표정: 얼굴을 지운 바탕 그림(`bunny_stand_base.webp`, `bunny_hug_base.webp`) 위에 `components/Face.tsx`가 눈·눈썹·입·효과를 그린다.
  표정 목록과 상황별 선택은 `lib/expressions.ts`(`LOOKS`, `IDLE`, `MOMENTS`). 개발 서버에서 `/?faces`를 열면 전체 표정을 한 화면에서 볼 수 있다.
  대화 답변의 표정 이름은 서버 `llm.ts`의 `EXPRESSIONS`와 맞춘다(앱이 모르는 이름은 무시된다).
- 포즈: 전신 포즈 그림은 `web/public/img/pose/*.webp`(495×780, 투명 배경), 목록과 상황별 선택은 `lib/poses.ts`. 포즈가 나오는 동안에는 꾸미기 아이템을 그리지 않는다.
- `web/android`, `web/ios` Capacitor 프로젝트. 앱 ID `kr.haru.companion`. 앱이 접속할 서버 주소는 `web/.env.native`
- `scripts/build-vercel.mjs` Vercel 빌드, `vercel.json`이 이를 호출 → `main`에 push 하면 자동 배포
- `store/` 스토어 스크린샷과 등록 문구(`STORE.md`)

## 지켜야 할 것

- 사용자는 아동·청소년이다. 위험 표현(자해·학대)은 모델에 맡기지 않고 `safety.ts`의 고정 안내(1388·109·112)로 답한다. 이 경로를 약화시키지 말 것.
- 보호자 화면에는 대화·일기 **내용**을 절대 내보내지 않는다(신호와 통계만). `api.test.ts`가 이를 검사한다.
- SQL은 PostgreSQL 방언, 자리표시자는 `?`. 여러 단계 쓰기는 한 문장(CTE)으로 처리해 반쯤 적용되는 일이 없게 한다.
- 비밀값(API 키, 서명 키, `.env`)은 커밋하지 않는다. Android 업로드 키(`*.jks`)는 저장소에 없고 소유자가 보관한다.
- 스토어의 "심사 제출" 같은 되돌리기 어려운 버튼은 소유자 확인 후 누른다.
