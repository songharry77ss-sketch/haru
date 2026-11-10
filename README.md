# 하루 haru

> 말하지 못한 마음을 가장 먼저 알아주는 AI 친구

하루는 아이·청소년이 반려 캐릭터를 돌보는 **평범한 행동**(쓰다듬기, 밥 주기, 놀아주기, 꾸미기, 대화)을 비언어적 정서 데이터로 읽어,
상담처럼 느껴지지 않게 마음을 살피는 웹앱입니다.

## 주요 기능

| 영역 | 내용 |
| --- | --- |
| 돌봄 | 쓰다듬기(부드러운/거친 터치 감지), 밥 주기(아침 8시 · 점심 12시 · 저녁 6시 루틴), 당근 받기 미니게임, 꾸미기·방 테마 |
| 대화 | Claude 기반 반려 캐릭터 대화. 키가 없으면 내장된 간단한 대화 모드로 동작 |
| 정서 분석 | 6가지 행동 변수 → 불안 · 안정 · 기쁨 · 무기력 4가지 상태 (`server/src/analysis.ts`, 가중치 전부 공개) |
| 리포트 | 마음 일기, 행동 분석(돌봄 루틴 · 상호작용 밸런스 · 거친 터치 · 접속 패턴), 마음 리포트(근거 요약 · 패턴 신호) |
| 관계 성장 | 친밀감에 따라 낯가림 → 친구 → 친한사이 → 단짝 → 베프 |
| 안전 | 자해·학대 등 위험 표현 감지 시 고정된 안내 + 1388 / 109 / 112 연결, 개인정보(전화번호·이메일) 자동 가림 |
| 건강한 이별 | 하루 사용 시간 제한(기본 30분) 후 캐릭터가 잠듦 |
| 보호자 | `/guardian/<코드>` — 리포트와 위험 신호 알림만 제공, **대화·일기 내용은 절대 노출하지 않음** |

## 구조

```
server/   Express API (TypeScript) + PostgreSQL
  src/api.ts        라우트
  src/analysis.ts   행동 기반 정서 분석
  src/llm.ts        Claude 대화 + 오프라인 대화
  src/safety.ts     위험 감지 · 도움 기관 · 개인정보 가림
  src/db.ts         DB 접속 (운영: Supabase Postgres / 개발: 내장 PGlite) + 스키마
web/      React + Vite 프론트엔드 (모바일 우선)
  android/, ios/    Capacitor 네이티브 앱 (kr.haru.companion)
scripts/  build-vercel.mjs — Vercel 배포용 빌드
store/    스토어 스크린샷 · 등록 문구 (STORE.md)
```

## 로컬 실행

Node 22.13 이상이 필요합니다. 데이터베이스 설치는 필요 없습니다(내장 Postgres가 `./data`에 만들어집니다).

```bash
npm install
```

```bash
npm run dev
```

API는 :8787, 웹은 :5173 에서 열립니다. 테스트는 `npm test`.

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` | Postgres 주소. Supabase의 **Transaction pooler** 주소를 씁니다. 없으면 내장 DB |
| `ANTHROPIC_API_KEY` | 설정하면 Claude로 대화합니다. 없으면 간단한 대화 모드 |
| `CLAUDE_MODEL` | 기본 `claude-opus-5-5` |
| `CORS_ORIGINS` | 추가로 허용할 웹 출처(쉼표 구분). 네이티브 앱 출처는 기본 허용 |

## 배포 (Vercel + Supabase)

1. Supabase 프로젝트를 만들고 테이블을 생성합니다.

```bash
DATABASE_URL="postgresql://…" npm run db:migrate
```

2. Vercel 프로젝트 환경 변수에 `DATABASE_URL`, `ANTHROPIC_API_KEY`를 넣습니다.
3. 빌드해서 올립니다.

```bash
npm run build:vercel
```

```bash
npx vercel deploy --prebuilt --prod
```

웹 파일은 Vercel CDN이, `/api/*`는 서울 리전(icn1)의 함수 하나가 처리합니다. 모든 테이블은 RLS가 켜져 있어 Supabase 공개 REST API로는 읽을 수 없고, API 서버만 접근합니다.

## 앱 빌드

앱이 접속할 서버 주소는 `web/.env.native`에 있습니다.

```bash
npm run native:sync
```

- Android: `web/android`에서 `./gradlew bundleRelease` (서명 정보는 `HARU_KEYSTORE_PROPERTIES` 환경 변수로 지정한 파일에서 읽음)
- iOS: GitHub Actions의 **iOS → App Store Connect** 워크플로를 실행 (Mac 불필요)

## 안내

하루는 의학적 진단·치료 도구가 아닙니다. 위험 신호가 감지되면 전문 기관 연결을 우선합니다.
