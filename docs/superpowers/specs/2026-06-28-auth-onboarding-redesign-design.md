# 로그인·온보딩 잔디 정원 리디자인 — 디자인 스펙

**날짜:** 2026-06-28
**관련 계획:** `docs/superpowers/plans/2026-06-28-auth-onboarding-warm-redesign.md`

## 목적

인증 진입 흐름(`/login`·`/signup`·`/onboarding`)을 참여자 경험(`/me`·영지)과 같은 **"잔디 정원" 웜 정체성**으로 통일하고, **브랜드 스플릿** 레이아웃으로 깔끔하게 재구성한다. 인증 로직은 불변, 프레젠테이션 + i18n 카피만 변경.

## 확정 결정 (사용자)

- **테마:** 잔디 정원 웜(항상 라이트). `profile-surface.module.css`의 토큰 재정의 기법 재사용.
- **레이아웃:** 브랜드 스플릿 — 데스크탑 좌 브랜드 / 우 폼, 모바일 상단 컴팩트 브랜드 밴드 + 폼.
- **범위:** 세 화면 모두, 공유 `AuthShell`.

## 팔레트 (profile-surface와 동일)

| 토큰 | 값 |
| --- | --- |
| canvas | `#ece5d6` |
| surface | `#fbfaf6` |
| surface-2 | `#ffffff` |
| inset | `#efe8d9` |
| ink / ink-muted / ink-subtle | `#1a2b22` / `#51604f` / `#8b9184` |
| accent / accent-strong | `#0f7a52` / `#0b5e3f` |
| accent-soft | `rgb(15 122 82 / 0.12)` |
| saving | `#2f9e6b` |
| honey / honey-strong / honey-soft | `#e8a13a` / `#b9740f` / `rgb(232 161 58 / 0.18)` |

- 에러색 `--color-overuse`는 **재정의하지 않음** → 전역 빨강(`#be123c`)이 크림 위에서 그대로 가독성 충족.
- 브랜드 패널 그라데이션: `linear-gradient(135deg, #0b5e3f 0%, #1f8a5d 48%, #6bbf93 100%)` + 우상단 화이트 블룸(`::after` radial).

## 레이아웃

### 데스크탑 (`min-width: 768px`)
- 2단 그리드: 브랜드 `1.05fr` | 폼 `1fr`, 각 컬럼 `min-height: 100dvh`.
- **브랜드 패널(좌):** 그린 그라데이션 + 블룸. 상단 = 브랜드마크(lucide `Sprout` + "CEMS" 워드마크) + eyebrow(`app.eyebrow`). 중단 = 태그라인(`account.brand.tagline`) + 가치 칩 3개(측정→적립→성장, lucide `Gauge`/`Coins`/`Sprout`). 하단 = `campus-building-lv3.png` 아이소메트릭 아트(잔디 톤 베이스 위, `next/image fill` + `objectFit:contain`).
- **폼 컬럼(우):** 크림 면, 세로 중앙 정렬, `max-width: 26rem`. 화면 제목(h1) + 서브타이틀 + 폼 + 교차 링크.

### 모바일 (`< 768px`)
- 단일 컬럼. 상단 **컴팩트 그라데이션 밴드**(약 8.5rem): 브랜드마크 + eyebrow + 한 줄 태그라인. 큰 건물 아트는 `display:none`(경량·깔끔).
- 그 아래 크림 폼 카드(풀블리드 패딩), 폼 + 링크.

## 컴포넌트 API — `AuthShell`

순수 프레젠테이션(훅 없음 → 서버 컴포넌트 가능). 폼은 `children`으로 슬롯.

```
type AuthShellProps = {
  brandName: string;       // app.brandName
  eyebrow: string;         // app.eyebrow
  tagline: string;         // account.brand.tagline
  values: { measure: string; earn: string; grow: string }; // account.brand.values
  title: string;           // 화면 제목
  subtitle?: string;       // 화면 보조 설명
  children: ReactNode;     // 폼
};
```

## 폼 스타일 (`.field` / `.primaryButton`, CSS Module)

- `.field`: 높이 ~2.75rem, `border-radius: 0.75rem`, `border: 1px solid --color-line`, `bg --color-surface`, 포커스 시 `border --color-accent` + `box-shadow 0 0 0 3px --color-accent-soft`. select 동일.
- 라벨: `--color-ink-muted`, 0.5rem 간격.
- `.primaryButton`: 높이 2.75rem, full-width, `bg --color-accent` / `text --color-on-accent`, 미세 그림자, hover `accent-strong`, disabled 60%.
- 교차 링크(회원가입/로그인): `--color-accent` 강조.
- 커스텀 값(포커스 링 등)은 Tailwind v4 JIT arbitrary 누락 이력(`max-h-[45vh]` 등) 때문에 **CSS Module 클래스**로.

## 모션

- 페이지 로드 시 폼 컬럼 요소(제목→서브타이틀→폼→링크)와 브랜드 요소를 `animation-delay` 스태거로 부드럽게 페이드/슬라이드 인(고임팩트 1회 연출). `prefers-reduced-motion`에서 비활성.

## 접근성

- 기존 `<label>` 연결 유지, 화면당 `h1` 1개.
- 브랜드 아트는 장식 → `alt=""`.
- 포커스 링 가시화, green/크림 대비 WCAG AA 충족(honey는 큰 텍스트/장식 한정).
- 모바일/데스크탑 모두 키보드 탭 순서 자연스럽게(브랜드 패널은 장식, 폼이 먼저 도달).

## 아트

- 기존 `public/estate-assets/campus-building-lv3.png` 재사용(성장하는 캠퍼스 건물 = 제품의 캐릭터). 신규 제작 없음.
- `next/image`(Next 16): `priority` deprecated → 사용 안 함. `fill` + `sizes`(데스크탑 폭만, 모바일 0) + `objectFit:contain`, 기본 lazy(모바일은 숨김이라 미다운로드).
