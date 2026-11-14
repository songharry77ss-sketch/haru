# 출시 진행 상황과 남은 단계

> 이 문서는 PC에서 Claude Code(크롬 연결)로 이어서 진행하기 위한 인수인계 문서입니다.
> 비밀번호·API 키·키 파일 내용은 채팅에 적지 말고, 소유자가 직접 입력하는 칸에서 멈춰 주세요.

## 현재 상태

| 항목 | 상태 |
| --- | --- |
| 코드 | 완료. `npm test` 21개 통과 |
| 웹 배포 | **됨**. `https://haru-companion-kr.vercel.app`, Vercel 팀 `Harry's projects`, GitHub 연결됨. Neon DB `haru-companion-kr-db`(Singapore, Free), `ANTHROPIC_API_KEY` 등록됨. health: `{"ok":true,"db":"postgres","ai":"model"}` |
| Android (Play) | **검토 전송함** (2026-11-13), 2026-11-14에도 "검토 중". 프로덕션 `5 (1.0)`(versionCode 5), 대한민국, 관리형 게시 꺼짐(승인되면 바로 공개). 결과는 Play Console → 게시 개요에서 확인 |
| iOS (App Store) | **제출 직전에서 막힘** (2026-11-14에도 같음). 버전 1.0에 빌드 6·스크린샷·문구·연락처·콘텐츠 권한·개인정보 게시까지 끝. "심사에 추가"를 누르면 "계약 업데이트" 안내만 뜨고 진행되지 않는다. 원인은 Apple 쪽 법인 전환 미완료(아래 11-14 기록). 소유자가 미국 세금 양식 두 개를 내야 한다 |
| 스토어 자료 | `store/ios`, `store/ios-6.3`, `store/android`에 스크린샷·아이콘, 문구와 양식 답변은 `store/STORE.md` |
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
  App Store Connect에는 아직 예전 스크린샷이 올라가 있어 `store/ios-6.3`의 네 장을 바꿔 올려야 한다. 설명·키워드·심사 메모도 `store/STORE.md`의 새 문구(친구 넷)로 바꾼다.
  App Store Connect는 로그인이 풀려 있다(소유자가 다시 로그인해야 함). 남은 것은 위와 같다: 전화번호, 콘텐츠 권한, 빌드 6 선택, 스크린샷·문구 교체, 그다음 제출.
- Play Console(같은 날 오후): 기본 스토어 등록정보(이름·설명·아이콘·그래픽·스크린샷 7장, 이미지는 AI 생성으로 표시) 저장, 카테고리 라이프스타일,
  연락처(문의 이메일·웹사이트), 프로덕션 국가 대한민국 저장. 데이터 보안 양식은 모두 답해 **초안으로 저장**(수집: 이름(별명)·사용자 ID·기타 정보(나이대)·
  기타 인앱 메시지·건강 정보·앱 상호작용·기타 사용자 제작 콘텐츠, 공유 없음, 전송 암호화, 계정 삭제 주소). 최종 저장은 타겟층 선언이 끝나야 된다.
  프로덕션 "새 버전" 화면에 출시 노트(`첫 출시`)까지 넣어 둠. **남은 것:** ① 타겟층 및 콘텐츠 2단계의 아동 관련 법 준수 보증(소유자 결정),
  ② `Downloads/haru-1.0-release-5.aab`를 새 버전 화면에 끌어다 놓기(파일이 16MB라 자동 업로드 한도 10MB를 넘음), ③ 데이터 보안 최종 저장, ④ 게시 개요에서 검토 전송.
  스토어 스크린샷 순서가 올린 순서와 다르게 들어갔을 수 있으니(1-home이 맨 앞이어야 함) 등록정보에서 확인한다.

### 2026-11-13 진행 기록

- 소유자 결정: Play 대상 연령은 **초등학생 포함(9–12, 13–15, 16–17세)**, 아동 관련 법 준수 보증에 체크. App Store 콘텐츠 권한은 "타사 콘텐츠 없음".
- Play Console: 번들 `haru-1.0-release-5.aab` 업로드(파일을 두 조각으로 나눠 올린 뒤 페이지에서 합침, 합친 파일의 SHA-256이 원본과 같음을 확인),
  출시명 `5 (1.0)`, 출시 노트 저장. 타겟층 및 콘텐츠 저장(교사 추천 프로그램은 참여 안 함), 데이터 보안 최종 저장(가족 정책 약속 배지는 표시 안 함),
  휴대전화 스크린샷 순서를 홈·먹이·대화·리포트·행동·일기·꾸미기로 맞춤. 게시 개요에서 **변경사항 10개를 검토로 전송**.
  타겟층 양식 2단계의 "다음"은 번들을 올리기 전에는 눌러도 넘어가지 않았고, 번들을 올린 뒤에는 넘어갔다.
- App Store Connect: 콘텐츠 권한 "아니요" 저장, 심사 연락처(같은 계정의 다른 앱에 등록된 연락처와 같은 값) 저장, 설명·키워드·심사 메모·프로모션 문구를 친구 넷 기준으로 교체,
  스크린샷 7장을 `store/ios-6.3`의 새 파일로 교체, 빌드 6 선택, "앱이 수집하는 개인정보" 게시.
  **막힌 곳:** "심사에 추가"를 누르면 "계약 업데이트: Apple Developer Program 사용권 계약이 업데이트되어 검토가 필요합니다"만 뜬다.
  developer.apple.com의 계약 화면에는 사용권 계약이 2026-10-30에 수락된 것으로 나오고, App Store Connect 첫 화면에는 "개발자 정보 업데이트 처리 중"이라는 안내가 있다.
  비즈니스 → CRAVING(신규 법인)의 무료·유료 앱 계약이 "대기 중(신규 법인)", 은행 계좌 "처리 중", 미국 세금 양식 두 개가 "세금 정보 없음"이다.
  개인 → 법인 전환을 Apple이 처리하는 동안 제출이 막히는 것으로 보인다(추정). 소유자가 미국 세금 양식을 내고, 처리가 끝난 뒤 "심사에 추가" → 제출만 누르면 된다.

### 2026-11-14 진행 기록

- Play: 게시 개요가 여전히 "변경사항을 검토 중입니다". 할 일 없음.
  별개로 Play Console 알림에 "결제 프로필: 지급 보류, 신원 확인 필요"(2026-11-06)가 있다. 수익 지급에 관한 것이고 신분증 확인은 소유자만 할 수 있다. 무료 앱 심사를 막는다는 표시는 없다.
- App Store: "심사에 추가"는 여전히 "계약 업데이트" 안내에 막힌다. 버튼을 눌러도 서버 요청이 나가지 않고, 페이지가 처음 받아 온 계정 상태로 막는다.
  - 확인한 값: `ra/v1/providerCapabilities`의 `contractStatus`가 `FREE_APP_AGREEMENT_OUTDATED`, `companyName`이 아직 예전 개인 명의(HYEONSEOP SONG).
    `agreementsStatus/v2`에서 신규 법인(CRAVING)의 무료·유료 앱 계약은 `NotInEffect`, 예전 명의의 계약은 `InEffect`.
    `olympus/v1/contractMessages`에는 "개발자 정보 업데이트 처리 중 … 처리가 완료될 때까지 업데이트된 Program License Agreement의 효력이 발생하지 않을 수 있습니다".
  - developer.apple.com 계정: 법인명 CRAVING, 등록 유형 조직, 사용권 계약 2026-10-30 발행·수락. 수락할 계약은 남아 있지 않다.
  - 즉 앱이나 제출 자료의 문제가 아니라 **계정의 법인 전환이 App Store Connect에 아직 반영되지 않은 것**이다.
    Apple 도움말(Sign and update agreements)은 법인 정보 변경이 승인된 뒤 반영까지 최대 2주가 걸리고, 바뀐 세금·은행 정보를 내라고 안내한다. 10-29 기준 2주는 이미 지났다.
  - 남아 있는 소유자 몫: 비즈니스 → CRAVING → 세금 양식의 미국 양식 두 개("세금 정보 없음").
    ① U.S. Certificate of Foreign Status of Beneficial Owner: 법인 유형 선택, 서명자 직함 입력, 미국 내 직원·자산이 없다는 선언. 납세번호 칸은 없다.
    ② U.S. Substitute Form W-8BEN-E: 법인 유형, 외국 납세번호(9b), 조세조약 혜택 선택(Part III), 위증 시 처벌 조건의 서명.
    둘 다 "제출 후에는 변경할 수 없음"이고 대표자의 법적 선언이라 Claude는 열어 보기만 하고 입력·제출하지 않았다.
  - 세금 양식을 내면 풀리는지는 확인되지 않았다(Apple 안내문상 필요한 절차이긴 하다). 제출하고 하루쯤 지나도 그대로면 Apple Developer Support(멤버십 및 계정 → 계약)에 법인 전환이 멈춰 있다고 문의한다.
  - 풀리면 할 일은 그대로: 버전 1.0 화면에서 "심사에 추가" → 제출.
- 같은 날 추가로 확인한 것:
  - 소유자는 **개인사업자**다(상호 크레이빙, 주식회사 아님). 개인정보처리방침·이용약관의 "(주)하루"를 "크레이빙"으로 고쳐 배포했다. App Store 저작권 칸은 이미 `2026 CRAVING`.
  - Apple 도움말(View agreements status)의 정의: "Pending (New Legal Entity)"는 "법인을 변경했으며 새 법인으로 새 계약에 서명해야 한다"는 상태다.
    그런데 비즈니스 → CRAVING 화면의 계약 줄에는 서명 버튼이 없고, 표시되는 "1개의 작업 대기 중"은 세금 양식 안내뿐이다.
  - 예전 개인 명의(HYEONSEOP SONG) 쪽은 무료·유료 계약 활성, 세금 양식은 개인용 **W-8BEN**이 2026-10-05에 활성. 은행 계좌는 "처리 중" 안내가 계속 떠 있다.
  - 신규 법인(CRAVING)에는 법인용 **W-8BEN-E**만 배정되어 있고 유형 목록에 개인사업자·개인 항목이 없다.
    Apple 개발자 포럼에 같은 처지(개인사업자 + 조직 계정 + W-8BEN-E)에서 멈췄다는 글이 여럿 있고 공식 답은 없다(thread 855140, 744944).
  - 그래서 소유자가 할 일: ① 세무사에게 W-8BEN-E의 유형과 조세조약 칸을 어떻게 채울지 확인해 제출하거나, ② Apple에 "개인사업자인데 조직 계정이라 W-8BEN-E만 나온다, 법인 전환이 멈춰 제출이 막혔다"고 문의. 둘을 같이 진행하는 것이 빠르다.
  - **Apple 문의 보냄** (소유자 승인, 2026-11-14): 멤버십 및 계정 → 계약 및 계약서 → 이메일, **케이스 ID `30000015037461`**.
    내용: 개인 → 조직 전환 후 CRAVING 계약이 "대기 중(신규 법인)"에서 멈춤(서명 버튼 없음), 앱 6833322014 제출이 "계약 업데이트"에 막힘,
    W-8BEN-E에 개인사업자 항목이 없음(예전 개인 명의는 W-8BEN 활성). 요청: 멈춘 이유와 남은 단계, 개인사업자용 양식 배정 또는 작성 안내, 계약 처리 전 제출 가능 여부.
    답장은 Apple 계정 이메일로 온다. 지난 케이스는 developer.apple.com/contact → "나의 최근 케이스 보기".

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
2. 스토어 등록정보와 앱 콘텐츠 양식은 `store/STORE.md`대로. 개인정보처리방침 `https://haru-companion-kr.vercel.app/privacy`, 계정 삭제 `https://haru-companion-kr.vercel.app/support#delete`, 타깃 연령은 9–17세(소유자 결정, 2026-11-13).
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
