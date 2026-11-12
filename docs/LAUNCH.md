# 출시 진행 상황과 남은 단계

> 이 문서는 PC에서 Claude Code(크롬 연결)로 이어서 진행하기 위한 인수인계 문서입니다.
> 비밀번호·API 키·키 파일 내용은 채팅에 적지 말고, 소유자가 직접 입력하는 칸에서 멈춰 주세요.

## 현재 상태

| 항목 | 상태 |
| --- | --- |
| 코드 | 완료. `npm test` 21개 통과 |
| 웹 배포 | **됨** (2026-11-11). `https://haru-companion-kr.vercel.app`, Vercel 팀 `Harry's projects`, GitHub 연결됨. Neon DB `haru-companion-kr-db`(Singapore, Free) 연결. **`ANTHROPIC_API_KEY`만 아직 없음**: health의 `ai`가 `offline` |
| Android | 서명된 출시 파일 `haru-1.0-release.aab`(versionCode 1) 빌드 완료. 파일과 업로드 키(`haru-android-signing-key.zip`)는 소유자에게 전달됨. Play Console 업로드는 아직 |
| iOS | GitHub Actions 워크플로(`iOS → App Store Connect`) 준비됨. 저장소 Secrets 4개가 없어서 아직 빌드 못 함 |
| 스토어 자료 | `store/ios`, `store/android`에 스크린샷·아이콘, 문구와 양식 답변은 `store/STORE.md` |
| AI 모델 | 미정. 소유자가 비용을 보고 정하기로 함(환경 변수 `CLAUDE_MODEL`) |

### 2026-11-11 진행 기록

- 웹: 표정 119종(실시간 얼굴)·포즈 79종(Codex로 생성한 그림)·말풍선 대화가 `main`에 반영되어 운영 중.
- AI 대화: 아직 내장 답변 모드. 크롬에 로그인된 Claude Console 계정(opqrttuk)은 잔액 0. 크레딧이 있는 계정(opqrttuj)으로 **소유자가** 키를 만들어 Vercel `ANTHROPIC_API_KEY`에 붙여넣고 재배포해야 한다. 실제 AI 답변 경로는 키가 없어 아직 한 번도 검증하지 못했다.
- App Store: 번들 ID `kr.haru.companion` 등록 완료(2-1), 앱 레코드 생성 완료(2-2, Apple ID `6833322014`, 팀 CRAVING `UQLDQDU878`).
  2-3의 API 키 `haru-ci`(관리자)는 생성 창에 값만 채워 둠: **"생성" 클릭과 `.p8` 내려받기, 2-4의 Secrets 4개 등록은 소유자가 직접** (자동 권한 검사에서 Claude의 키 생성·Secret 등록이 거부됨).
- Play Store: CRAVING 조직 계정에 앱 생성 완료(3-1, 패키지 `kr.haru.companion`, 한국어·앱·무료). 스토어 등록정보와 앱 콘텐츠 양식은 아직.
- Android 파일: 기존 `haru-1.0-release.aab`에는 표정·포즈 추가 전 화면이 들어 있다. 새 화면을 넣으려면 `versionCode`를 올려 다시 빌드해야 하는데, 이 PC에는 JDK·Android SDK가 없다.

### 2026-11-12 진행 기록

- AI 대화: `ANTHROPIC_API_KEY` 등록 후 재배포, health `ai: model`. 실제 대화 3턴 확인(말풍선·표정·빠른 답 정상).
- iOS: `ios.yml`을 "서명 없이 아카이브 → 내보낼 때 App Store 서명" 방식으로 고쳐 빌드 5(1.0) 업로드 완료, 버전 1.0에 연결.
  App Store Connect에 설명·키워드·URL·심사 메모·스크린샷 7장(`store/ios-6.3`)·부제·카테고리·가격(무료)·판매 국가(대한민국)·저작권 입력. 연령 등급과 개인정보 답변은 소유자가 완료.
  **남은 것(소유자):** 앱 정보 → 콘텐츠 권한("아니요"), 버전 페이지 연락처 전화번호(이름·이메일은 채워 둠, 저장 필요). 그다음 "심사에 추가".
- Android: 새 업로드 키를 만들어 `Desktop/01_크레이빙(회사·서비스)/하루 관련/하루-앱-중요파일`에 보관(`haru-upload.jks`, `키 정보.txt`). 저장소 Secrets 3개 등록됨.
  `android.yml`로 서명된 번들 생성(versionCode 4): `Downloads/haru-1.0-release-4.aab`.
- Play Console 앱 콘텐츠: 개인정보처리방침·광고 없음·로그인 없음·광고 ID 미사용·정부 앱 아님·금융 기능 없음·건강(스트레스 관리·휴식·정신력)·콘텐츠 등급(전체이용가, 생성형 AI 콘텐츠 있음으로 응답) 저장.
  **멈춘 곳:** 타겟층 및 콘텐츠. 소유자가 9–12세 포함을 선택했고, 2단계의 "아동 관련 법(COPPA·GDPR 등) 준수 보증" 체크는 소유자 판단이 필요해 비워 둠. 데이터 보안, 스토어 등록정보(문구·그래픽), 번들 업로드는 아직.

- 디자인(같은 날 오후): Figma `하루 UI/UX`의 친구 넷을 모두 고를 수 있게 함. 수달·강아지·분홍토끼는 Codex로 포즈 81장씩 생성(실시간 표정·꾸미기 포함),
  친구 고르기 화면과 설정의 "함께하는 친구"에서 선택. 홈 하단을 흰 패널로 바꾸는 등 화면을 정리.
  새 화면이 들어간 빌드: **iOS 빌드 6**(App Store Connect에 업로드됨, 버전 1.0에서 빌드 5 대신 6을 선택해야 함), **Android versionCode 5**(`Downloads/haru-1.0-release-5.aab`).
  스토어 스크린샷 1·2·3·7번(홈·먹이·대화·꾸미기)은 새 화면으로 다시 찍었다: 개발 서버를 켜고 `node scripts/store-shots.mjs`.
  App Store Connect에는 아직 예전 스크린샷이 올라가 있어 `store/ios-6.3`의 네 장을 바꿔 올려야 한다.

## 1. 웹 배포 (Vercel)

1. <https://vercel.com/new> → GitHub로 로그인(Hobby 무료) → `songharry77ss-sketch/haru` Import.
2. Project Name `haru-companion-kr`(정확히), Framework Preset `Other`. Root Directory와 Build 설정은 그대로.
3. Environment Variables에 `ANTHROPIC_API_KEY` 추가 — **값은 소유자가 직접 입력**.
4. Deploy.
5. 프로젝트 → Storage → Create Database → Neon(Postgres). Region Singapore, Free. 프로젝트에 연결(모든 환경, Custom Prefix 비움). `DATABASE_URL`이 자동으로 들어간다.
6. Deployments → 최신 배포 → Redeploy.
7. `https://haru-companion-kr.vercel.app/api/health` 가 `{"ok":true,"db":"postgres","ai":"model"}` 이면 정상. 테이블은 첫 실행 때 자동 생성된다.

확인: 사이트를 열어 시작하기 → 캐릭터 쓰다듬기 → 밥 주기 → 대화 → 분석 탭까지 눌러 본다. `/privacy`, `/terms`, `/support`도 열리는지 본다.

도메인이 다르게 나오면(이름이 이미 사용 중) `web/.env.native`의 주소를 실제 도메인으로 바꾸고 앱을 다시 빌드해야 한다.

## 2. App Store

1. <https://developer.apple.com/account/resources/identifiers/list> → `+` → App IDs → App → Bundle ID(Explicit) `kr.haru.companion`.
2. <https://appstoreconnect.apple.com/apps> → `+` 신규 앱: iOS, 이름 `하루 - 마음을 알아주는 AI 친구`, 한국어, 번들 ID 위의 것, SKU `haru-ios-1`.
3. <https://appstoreconnect.apple.com/access/integrations/api> → 팀 키 `+` → 이름 `haru-ci`, 액세스 `관리(Admin)`. Issuer ID, 키 ID를 적고 `.p8` 파일은 소유자가 내려받는다(한 번만 가능).
4. 저장소 Settings → Secrets and variables → Actions 에 4개 추가: `APPLE_TEAM_ID`(멤버십의 10자리 팀 ID), `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`(`.p8` 내용 전체 — 소유자가 직접 붙여넣기).
5. 빌드 실행: Actions 탭 → `iOS → App Store Connect` → Run workflow (또는 `gh workflow run ios.yml`). 성공하면 5~30분 뒤 App Store Connect → TestFlight에 빌드가 보인다.
6. 앱 버전 페이지에서 그 빌드를 선택하고, `store/STORE.md`의 문구·연령 등급·개인정보 답변, `store/ios`의 스크린샷을 넣는다.
7. **심사 제출은 소유자 확인 후.**

## 3. Play Store

1. <https://play.google.com/console> → 앱 만들기: `하루 - 마음을 알아주는 AI 친구`, 한국어, 앱, 무료.
2. 스토어 등록정보와 앱 콘텐츠 양식은 `store/STORE.md`대로. 개인정보처리방침 `https://haru-companion-kr.vercel.app/privacy`, 계정 삭제 `https://haru-companion-kr.vercel.app/support#delete`, 타깃 연령은 13세 이상만.
3. 프로덕션 → 새 버전 → `haru-1.0-release.aab` 업로드(소유자가 파일 선택) → 출시 노트 `첫 출시`.
4. **심사 제출은 소유자 확인 후.**

## Android를 다시 빌드해야 할 때

**GitHub에서 (권장, PC에 JDK·SDK 필요 없음):** Actions 탭 → `Android → release bundle (AAB)` → Run workflow.
`versionCode`는 비워 두면 실행 번호+1. 끝나면 실행 화면 아래 Artifacts의 `haru-android-aab`를 받아 Play Console에 올린다.
서명용 저장소 Secrets 3개가 필요하다: `ANDROID_KEYSTORE_BASE64`(`haru-upload.jks`를 base64로), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`(`키 정보.txt`의 값).
없으면 서명 안 된 파일만 만들어지고 실행은 실패로 끝난다(빌드가 되는지 확인용).

**이 PC에서 직접:**

JDK 21과 Android SDK(platform 36, build-tools 35)가 필요하다.

1. 소유자가 받은 `haru-upload.jks`를 저장소 **밖**에 두고, 같은 위치에 `keystore.properties`를 만든다(`키 정보.txt`의 값 사용).

```properties
storeFile=C:/keys/haru-upload.jks
storePassword=...
keyAlias=haru-upload
keyPassword=...
```

2. 환경 변수 `HARU_VERSION_CODE`에 이전보다 큰 번호를 준다(이미 올린 번호는 다시 쓸 수 없음, 기본 1).
3. 빌드:

```bash
npm run native:sync
```

```bash
cd web/android && HARU_KEYSTORE_PROPERTIES=C:/keys/keystore.properties ./gradlew bundleRelease
```

결과물: `web/android/app/build/outputs/bundle/release/app-release.aab`
