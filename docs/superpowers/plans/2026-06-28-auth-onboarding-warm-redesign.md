# 로그인·온보딩 화면 잔디 정원 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증 진입 흐름인 `/login`·`/signup`·`/onboarding` 세 화면을, 참여자 경험(`/me`·영지)에서 쓰는 **"잔디 정원" 웜 테마**로 통일하고, **브랜드 스플릿 레이아웃**(데스크탑: 좌 브랜드 패널 + 우 폼 / 모바일: 상단 컴팩트 브랜드 + 폼)으로 깔끔하게 재디자인한다. 인증 로직·서버 액션·DB는 손대지 않고 **프레젠테이션과 i18n 카피만** 바꾼다.

**Architecture:** 세 페이지가 공유하는 새 프레젠테이션 컴포넌트 `AuthShell`을 만든다. `AuthShell`은 `/me`가 쓰는 것과 동일한 기법 — **`--color-*` 토큰을 래퍼에 로컬 재정의**하는 CSS Module(`auth-shell.module.css`) — 으로 자손 전체를 웜 팔레트로 리스킨하므로, 지도/대시보드/영지 토큰은 건드리지 않는다(항상 라이트). `AuthShell`은 서버 페이지에서 i18n 문자열을 prop으로 받는 **순수 프레젠테이션 컴포넌트**(훅 없음)라 서버 컴포넌트로 둘 수 있고, 폼(클라이언트)은 `children`으로 슬롯한다. 기존 폼 3종은 이미 토큰 유틸(`bg-surface`/`bg-accent`/`border-line`/`text-overuse`)을 쓰므로 토큰 재정의만으로 자동 리스킨되며, 입력/버튼/포커스 표현만 다듬어 "깔끔"의 기준을 맞춘다. 브랜드 패널 아트는 기존 `public/estate-assets/campus-building-lv3.png`(성장하는 캠퍼스 건물 = 제품의 캐릭터)를 재사용한다.

**Tech Stack:** Next.js 16.2.9 (App Router, 서버 컴포넌트 + 서버 액션 / `params: Promise<…>`), React 19.2.7, TypeScript, Tailwind CSS v4(토큰 유틸 `bg-surface`/`text-ink`/`bg-accent`/`border-line` 등), CSS Modules, `next/image`, lucide-react, Vitest(jsdom 컴포넌트 테스트). Supabase·서버 액션은 **변경 없음**.

---

## Before You Start (필수 사전 확인)

이 저장소는 표준 Next.js가 아니다. 코드를 쓰기 전에 다음을 읽어라(코드 변경 아님, 커밋 없음):

- `AGENTS.md` — Next.js 로컬 문서 우선 규칙.
- `node_modules/next/dist/docs/` 중 관련 문서: **`next/image`**(브랜드 아트, `priority`/`sizes`/`alt`), 서버 컴포넌트에서 client `children` 슬롯, `params: Promise<{…}>` 처리. ("This is NOT the Next.js you know" — 특히 `next/image` API를 가정하지 말 것.)
- 본 계획이 따라야 할 기존 패턴:
  - **웜 토큰 스코프 기법(핵심 참조):** `src/features/account/components/profile-surface.module.css`의 `.surface { --color-canvas/…/--honey: … }` 블록. 동일 팔레트를 `auth-shell.module.css`에 복제한다(estate-shell·profile-surface가 이미 각자 복제하는, 저장소가 채택한 self-contained 방식).
  - **현재 인증 화면 셸:** `src/app/[locale]/login/page.tsx`·`signup/page.tsx`·`onboarding/page.tsx`(`<CampusEnergyProviders>` 안에 `<main className="… max-w-sm content-center …">` + `<h1>` + 폼). 이 `<main>` 래퍼를 `AuthShell`로 교체한다.
  - **jsdom 컴포넌트 렌더 테스트:** `src/features/account/__tests__/profile-hero.test.tsx`(createRoot/act 패턴). `AuthShell`은 훅이 없어 `I18nProvider` 없이 직접 렌더 가능.
  - **클라이언트 폼 + `useActionState`:** 손대는 폼 3종(`login-form.tsx`·`signup-form.tsx`·`onboarding-form.tsx`)은 로직 유지, className만 정리.

**검증 명령(플랜 전체 공통):**
- 테스트: `npm run test`
- 린트: `npm run lint`
- 빌드: `npm run build`
- 라이브: `npm run build && npm run start` 후 `/ko/login`·`/ko/signup`·`/ko/onboarding`를 모바일 375px·데스크탑 1280px에서 스크린샷. (이 라우트들은 Mapbox 캔버스가 아니므로 프리뷰 스크린샷이 멈추는 지도 라우트 제약과 무관 — 실제 캡처로 검증 가능.)

**커밋 규칙:** 사용자가 푸시를 요청하기 전에는 푸시하지 않는다. 각 Task 끝에서만 커밋한다. (사용자는 보통 "구현 진행 + 새 브랜치"를 지시하므로, 지시가 있으면 새 feature 브랜치에서 진행한다.)

---

## File Structure

**신규 (Create):**

- `src/features/account/components/auth-shell.tsx` — 브랜드 스플릿 프레젠테이션 셸. props: `{ eyebrow, brandName, tagline, valueProps?, title, subtitle?, children, footer? }`. 좌 브랜드 패널(그라데이션 + 브랜드마크 + 태그라인 + `campus-building-lv3.png` 아트) + 우 폼 컬럼(`title`/`subtitle` + `children` 슬롯). `next/image` 사용. 훅 없음(서버 컴포넌트 가능).
- `src/features/account/components/auth-shell.module.css` — `.shell`에 웜 `--color-*`/`--honey` 토큰 재정의(profile-surface와 동일 값) + 스플릿 반응형 레이아웃 + `.field`/`.primaryButton` 등 입력·버튼·포커스 스타일(Tailwind v4 JIT arbitrary 누락 이력이 있어 커스텀 값은 CSS Module로).
- `src/features/account/__tests__/auth-shell.test.tsx` — jsdom 렌더 스모크: brandName·title·태그라인 노출, `children`(폼 자리) 렌더, 접근성용 `h1` 존재 확인.
- `docs/superpowers/specs/2026-06-28-auth-onboarding-redesign-design.md` — 디자인 스펙(팔레트·레이아웃·아트·컴포넌트 API·반응형·a11y) 기록.

**수정 (Modify):**

- `src/app/[locale]/login/page.tsx` — `<main>` 래퍼 → `<AuthShell …>{<LoginForm next={next}/>}</AuthShell>`. i18n 문자열을 prop으로 전달.
- `src/app/[locale]/signup/page.tsx` — 동일하게 `AuthShell`로 래핑.
- `src/app/[locale]/onboarding/page.tsx` — 동일. 온보딩은 폼이 더 길어(셀렉트 3개) 폼 컬럼 스크롤/세로 정렬을 확인.
- `src/features/account/components/login-form.tsx` — 입력/버튼/링크를 `.field`/`.primaryButton` + 토큰 유틸로 정리, lucide 아이콘(mail/lock) 선택 적용. 로직 불변.
- `src/features/account/components/signup-form.tsx` — 동일 정리.
- `src/features/account/components/onboarding-form.tsx` — 동일 정리(select 포함).
- `src/i18n/messages/ko.ts`·`en.ts` — `account.brand`(eyebrow/tagline/valueProps[]) + 각 화면 `subtitle` 추가. `app.brandName`("CEMS")·`app.eyebrow`("캠퍼스 에너지 관리 시스템")는 재사용.
- `src/i18n/messages/types.ts` — 위 신규 키 타입 추가.

**변경 없음(중요):** 서버 액션(`actions/auth.ts`·`actions/profile.ts`), DAL, Supabase, RLS/RPC, `proxy.ts`, 지도/대시보드/영지/`globals.css` 전역 토큰.

---

## 디자인 스펙 요약 (자세한 건 spec 문서)

**팔레트(웜 잔디 정원, profile-surface와 동일):** canvas `#ece5d6`, surface `#fbfaf6`, ink `#1a2b22`, accent(green) `#0f7a52`/strong `#0b5e3f`, saving `#2f9e6b`, honey `#e8a13a`. 에러색 `--color-overuse`는 재정의하지 않고 전역 빨강을 유지(크림 위에서 가독성 충분).

**브랜드 패널 그라데이션:** `linear-gradient(135deg, #0b5e3f 0%, #1f8a5d 48%, #6bbf93 100%)` + 우상단 화이트 블룸(profile-surface `.cover::after`와 동일 기법).

**레이아웃:**
- 데스크탑(`min-width: 768px`): 2단 그리드(브랜드 `1.1fr` | 폼 `1fr`), 각 컬럼 `min-height: 100dvh`. 브랜드 패널 하단에 `campus-building-lv3.png` 앵커(잔디 톤 베이스), 상단에 브랜드마크(lucide `Sprout` + "CEMS") + eyebrow + 태그라인 + 선택적 가치 칩 3개(절감→포인트→영지).
- 모바일(`< 768px`): 단일 컬럼. 상단 컴팩트 그라데이션 밴드(약 7rem, 브랜드마크 + 한 줄 태그라인) + 그 아래 크림 폼 카드. 큰 건물 아트는 `hidden md:block`으로 모바일에서 숨겨 깔끔·경량 유지.

**폼:** `.field`(높이 ~2.75rem, 라운드, `border-line`, 포커스 시 green 보더 + `--color-accent-soft` 링), 라벨 간격 정리, 1차 CTA는 green `.primaryButton`(full-width, 미세 그림자, disabled 60%). 교차 링크(회원가입/로그인)는 green 강조. 선택적으로 입력 좌측 lucide 아이콘.

**접근성:** 기존 `<label>` 연결 유지, `h1` 한 개, `next/image` 장식 아트는 `alt=""`, 포커스 링 가시화, green/크림 대비 WCAG 충족(honey는 큰 텍스트/장식에만).

---

## Tasks

### Task 1 — 디자인 스펙 + i18n 카피
- [ ] `docs/superpowers/specs/2026-06-28-auth-onboarding-redesign-design.md`에 팔레트·레이아웃·아트·컴포넌트 API·반응형·a11y를 기록(위 요약 확장).
- [ ] `src/i18n/messages/types.ts`에 `account.brand: { eyebrow; tagline; valueProps: string[] }`와 `account.login.subtitle`·`account.signup.subtitle`·`account.onboarding`(기존 description 활용 가능) 타입 추가.
- [ ] `ko.ts`·`en.ts`에 동일 키 카피 추가. 예) ko tagline: "예측보다 아낀 만큼 포인트로. 캠퍼스를 함께 절약하고 우리 영지를 키워요." / valueProps: ["절감 측정", "포인트 적립", "영지 성장"].
- [ ] 검증: `npm run build`(타입 컴파일) + `npm run test` 통과.
- [ ] 커밋: `feat(account): add auth brand copy and redesign spec`.

### Task 2 — AuthShell 컴포넌트 + 모듈 CSS + 테스트
- [ ] `auth-shell.module.css` 작성: `.shell` 웜 토큰 재정의(profile-surface 값 복제) + 스플릿 반응형(`@media min-width:768px` 2단, 모바일 밴드) + `.brandPanel`/`.brandMobile`/`.formCol`/`.field`/`.primaryButton`/`.valueChip`.
- [ ] `auth-shell.tsx` 작성: props 시그니처대로 좌 브랜드/우 폼 렌더, `next/image`로 `campus-building-lv3.png`(데스크탑 전용, `alt=""`, 적절한 `sizes`). 훅 미사용 확인.
- [ ] `__tests__/auth-shell.test.tsx`(jsdom, profile-hero 패턴): brandName·title·tagline·children 슬롯·`h1` 렌더 단언.
- [ ] 검증: `npm run test`(신규 테스트 포함) + `npm run lint` + `npm run build`.
- [ ] 커밋: `feat(account): add warm garden brand-split auth shell`.

### Task 3 — 세 페이지를 AuthShell로 배선
- [ ] `login/page.tsx`·`signup/page.tsx`·`onboarding/page.tsx`의 `<main>` 래퍼를 `AuthShell`로 교체하고 i18n 문자열(eyebrow/brandName/tagline/valueProps/title/subtitle)을 prop으로 전달, 폼을 `children`으로 슬롯. `onboarding`은 기존 인증/프로필 가드와 schools/groups 로드 로직 유지.
- [ ] 검증: `npm run build`(라우트 3개 생성 확인) + 로그아웃 상태 HTTP 가드 실측(`/ko/onboarding`·`/ko/subjects/...` → `/ko/login` 리다이렉트 유지).
- [ ] 커밋: `feat(account): render login/signup/onboarding in the auth shell`.

### Task 4 — 폼 3종 표현 다듬기
- [ ] `login-form`·`signup-form`·`onboarding-form`의 입력/셀렉트/버튼/링크를 `.field`/`.primaryButton` + 토큰 유틸로 정리, 포커스 상태·간격 통일, 선택적 lucide 아이콘. `useActionState`·name·검증·에러 표시 로직은 불변.
- [ ] 검증: `npm run test` + `npm run lint` + `npm run build`. (폼 단위 테스트는 없으므로 회귀 위험 낮음 — 동작 불변 확인.)
- [ ] 커밋: `feat(account): refine auth form fields for the warm theme`.

### Task 5 — 라이브·격리 검증
- [ ] `npm run build && npm run start` 후 `/ko/login`·`/ko/signup`·`/ko/onboarding`(+ `/en/*`)를 **모바일 375px·데스크탑 1280px** 스크린샷으로 캡처: 스플릿/모바일 밴드, 웜 팔레트, 폼 포커스, 온보딩 셀렉트 동작, 콘솔 에러 0.
- [ ] **토큰 격리 확인:** `/ko`(지도)·`/ko/me`·영지 페이지가 시각적으로 불변인지 확인(웜 토큰이 인증 라우트 밖으로 새지 않음).
- [ ] 테스트 계정(`it@naver.com` / `123456`)으로 로그인 1회 실측 → 정상 진입(`next` 리다이렉트 포함) 확인.
- [ ] 전체 검증: `npm run test` + `npm run lint`(기존 `game-preview.tsx` 경고 2개 외 0 errors) + `npm run build` 통과.
- [ ] (선택) 별도 컨텍스트의 `code-reviewer`/`verifier`로 승인 패스 — 셀프 승인 금지.
- [ ] 회의록 정리는 사용자가 "기록해줘" 등으로 요청할 때만.

---

## Out of Scope / 한계 (문서화)

- 인증 방식 불변: 이메일+비밀번호만(소셜 로그인·비밀번호 재설정·매직링크는 향후 과제).
- 서버 액션·DAL·Supabase·RLS/RPC·`proxy.ts` 변경 없음 — 순수 프레젠테이션 + i18n.
- 다크모드: 인증 화면은 `/me`·영지와 동일하게 **항상 라이트**(웜 정원). 전역 다크 토큰과 무관.
- 브랜드 패널 아트는 신규 제작 없이 기존 `campus-building-lv3.png` 재사용(필요 시 후속 세션에서 전용 아트로 교체 가능).
- "둘러보기(게스트)" 진입 등 신규 진입 경로는 범위 밖(현 인증 게이트 유지).

## Definition of Done

- 세 화면이 웜 잔디 정원 + 브랜드 스플릿(반응형)으로 렌더되고, 모바일/데스크탑 스크린샷으로 확인됨.
- 인증 동작(로그인/가입/온보딩 저장·가드·`next` 리다이렉트) 회귀 없음.
- 지도/대시보드/영지/`/me` 시각적 불변(토큰 격리).
- `npm run test`·`npm run lint`·`npm run build` 모두 통과(기존 `game-preview.tsx` 경고 2개만 잔존).
