# 로그인·온보딩 잔디 정원 리디자인 — 디자인 스펙

**날짜:** 2026-06-28
**관련 계획:** `docs/superpowers/plans/2026-06-28-auth-onboarding-warm-redesign.md`

## 목적

인증 진입 흐름(`/login`·`/signup`·`/onboarding`)을 참여자 경험(`/me`·영지)과 같은 **"잔디 정원" 웜 정체성**으로 통일하고, 깔끔한 **일러스트형 중앙 카드**로 재구성한다. 인증 로직은 불변, 프레젠테이션 + i18n 카피만 변경.

## 방향 (1차 → 2차)

- **1차(폐기):** 브랜드 스플릿(좌 브랜드 패널 / 우 폼). 라이브에서 사용자가 "디자인적으로 별로 + 모바일 공백이 크다"고 피드백 → 폐기.
- **2차(현재):** 사용자가 제시한 레퍼런스(일러스트 헤더 + 언더라인 입력 + 알약 버튼의 컴팩트 카드)를 **우리 테마로** 재현. 모바일 공백 문제 해소(콘텐츠 크기의 단일 카드를 중앙 정렬).

## 팔레트 (profile-surface와 동일, `.page`에 토큰 재정의)

surface `#fbfaf6`, canvas `#ece5d6`, ink `#1a2b22`, accent `#0f7a52`/strong `#0b5e3f`, saving `#2f9e6b`, honey `#e8a13a`, error는 `#be123c` 고정(OS 다크에서도 크림 위 가독). 항상 라이트.

## 레이아웃

- **`.page`** (전체 뷰포트): 웜 라디얼 크림 배경 + 하단에 **부드러운 정원 언덕**(SVG 2겹 웨이브, 세이지 톤) + 카드 중앙 정렬(`place-items:center`). 모바일/데스크탑 공통(카드는 `max-width: 24.5rem`).
- **`.card`**: 크림 면, `border-radius: 30px`, 따뜻한 디퓨즈 그림자, `overflow:hidden`. 콘텐츠 크기라 큰 공백 없음.
  - **`.illu`** (헤더, 11.5rem): 그린 그라데이션 하늘 + 우상단 따뜻한 햇살 블룸 + 옅은 도트 텍스처. 좌상단 작은 **브랜드 태그**(leaf + CEMS, 글래스 알약). 중앙 하단에 **`campus-building-lv3` 아이소메트릭 건물**(소프트 접지 그림자 + 5.5s 플로트). 바닥은 **크림 SVG 웨이브**로 카드 본문으로 곡선 연결.
  - **`.body`**: 중앙 정렬 제목(h1) + 보조설명 + 폼.

## 폼 (언더라인 + 원형 아이콘, 레퍼런스 재현)

- **`.fieldRow`**: flex 행, 하단 보더만(언더라인). `:focus-within` 시 보더·아이콘이 accent로.
- **`.fieldIcon`**: 얇은 링 안의 lucide 아이콘(mail/lock·user/building/users).
- **`.field`**: 보더/배경 없는 투명 인풋, placeholder를 라벨로 사용. 실제 `<label>` 텍스트는 `.srOnly`로 보존(a11y). select는 네이티브 드롭다운 화살표 유지.
- **`.primaryButton`**: 풀폭 **알약**(`border-radius:999px`), green, 소프트 그림자, hover/active 반응.
- 교차 링크(회원가입/로그인)는 중앙 정렬·green 강조.
- 커스텀 값은 Tailwind v4 JIT arbitrary 누락 이력 때문에 **CSS Module**로.

## 컴포넌트 API — `AuthShell`

순수 프레젠테이션(훅 없음 → 서버 컴포넌트). 폼은 `children` 슬롯.

```
type AuthShellProps = {
  brandName: string;   // app.brandName (브랜드 태그)
  title: string;       // 화면 제목 (h1)
  subtitle?: string;   // 보조 설명
  children: ReactNode; // 폼
};
```

## 모션

카드 진입(페이드+살짝 스케일), 건물 미세 플로트. 모두 `prefers-reduced-motion`에서 비활성.

## 접근성

화면당 `h1` 1개, 입력은 `.srOnly` 라벨 + placeholder, 건물/웨이브 SVG·아이콘은 `aria-hidden`/`alt=""`. 포커스 시 언더라인·아이콘 강조. green/크림 대비 AA.

## 아트 / 기술

- 기존 `public/estate-assets/campus-building-lv3.png` 재사용(성장하는 캠퍼스 건물 = 제품의 캐릭터).
- `next/image`(Next 16): `priority` deprecated → 미사용. `.illuArt`(position:absolute, 고정 크기) 안에서 `fill` + `sizes="160px"` + `objectFit:contain`.
- 배경 언덕·헤더 웨이브는 인라인 SVG(에셋 로드 0, 어느 크기에서나 선명).

## 알려진 무관 이슈 (이 작업 범위 밖)

Next dev 오버레이의 "2 Issues"는 루트 레이아웃의 **테마 초기화 `<script>`**(`layout.tsx`, 플래시 방지)에서 나오는 앱 전역의 script-tag 경고 + 하이드레이션 미스매치다. 모든 페이지에 존재하는 기존 이슈이며 이 인증 리디자인과 무관. 필요 시 테마 초기화 방식 변경으로 별도 처리.
