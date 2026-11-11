# 출시 진행 상황과 남은 단계

> 이 문서는 PC에서 Claude Code(크롬 연결)로 이어서 진행하기 위한 인수인계 문서입니다.
> 비밀번호·API 키·키 파일 내용은 채팅에 적지 말고, 소유자가 직접 입력하는 칸에서 멈춰 주세요.

## 현재 상태

| 항목 | 상태 |
| --- | --- |
| 코드 | 완료. `npm test` 18개 통과 |
| 웹 배포 | **됨** (2026-11-11). `https://haru-companion-kr.vercel.app`, Vercel 팀 `Harry's projects`, GitHub 연결됨. Neon DB `haru-companion-kr-db`(Singapore, Free) 연결. **`ANTHROPIC_API_KEY`만 아직 없음**: health의 `ai`가 `offline` |
| Android | 서명된 출시 파일 `haru-1.0-release.aab`(versionCode 1) 빌드 완료. 파일과 업로드 키(`haru-android-signing-key.zip`)는 소유자에게 전달됨. Play Console 업로드는 아직 |
| iOS | GitHub Actions 워크플로(`iOS → App Store Connect`) 준비됨. 저장소 Secrets 4개가 없어서 아직 빌드 못 함 |
| 스토어 자료 | `store/ios`, `store/android`에 스크린샷·아이콘, 문구와 양식 답변은 `store/STORE.md` |
| AI 모델 | 미정. 소유자가 비용을 보고 정하기로 함(환경 변수 `CLAUDE_MODEL`) |

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

JDK 21과 Android SDK(platform 36, build-tools 35)가 필요하다.

1. 소유자가 받은 `haru-upload.jks`를 저장소 **밖**에 두고, 같은 위치에 `keystore.properties`를 만든다(`키 정보.txt`의 값 사용).

```properties
storeFile=C:/keys/haru-upload.jks
storePassword=...
keyAlias=haru-upload
keyPassword=...
```

2. `web/android/app/build.gradle`의 `versionCode`를 1 올린다(이미 올린 번호는 다시 쓸 수 없음).
3. 빌드:

```bash
npm run native:sync
```

```bash
cd web/android && HARU_KEYSTORE_PROPERTIES=C:/keys/keystore.properties ./gradlew bundleRelease
```

결과물: `web/android/app/build/outputs/bundle/release/app-release.aab`
