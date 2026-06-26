# 개인 프로필 페이지 인스타그램 리디자인 + 에너지 잔디 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/[locale]/me` 개인 프로필 페이지를 인스타그램형 헤더(원형 아바타+레벨 링, 스탯 줄, 핸들/한 줄 소개, 배지 하이라이트)로 리디자인하고, point_events 기반 "에너지 잔디"(GitHub 기여 그래프, 그날 획득 포인트로 진하기) + 편집 가능한 핸들·소개를 가볍게 추가한다.

**Architecture:** 기존 서버 컴포넌트 `/me`는 그대로 서버에서 데이터를 로드하되, 프레젠테이션을 새 클라이언트 컴포넌트(`ProfileHero`, `ContributionGraph`, `AchievementHighlights`)로 재구성한다. 잔디/배지/스탯은 **순수 도메인 함수**(TDD)로 계산하고(서버에서 호출), point_events는 이미 `getMyPointEvents`가 전량 반환하므로 **새 DB 쿼리 없이** 재사용한다. 편집(핸들·소개)만 `profiles`에 컬럼 2개를 추가하는 작은 마이그레이션 + 온보딩과 동일한 직접 업데이트 패턴의 서버 액션으로 처리한다. 배지의 실제 "수여"(최우수 학생 등 관리자 부여)는 범위 밖이며, 지금은 보유 데이터에서 파생한 성취 + 잠금된 미래 슬롯만 표시한다.

**Tech Stack:** Next.js 16.2.9 (App Router, 서버 컴포넌트 + 서버 액션), React 19.2.4, TypeScript, Tailwind CSS v4(토큰: `bg-surface`/`text-ink`/`bg-accent`/`text-saving`/`shadow-card` 등), CSS Modules, Supabase(Postgres + RLS), Vitest(도메인 + jsdom 컴포넌트 테스트), lucide-react.

---

## Before You Start (필수 사전 확인)

이 저장소는 표준 Next.js가 아니다. 코드를 쓰기 전에 다음을 읽어라(코드 변경 아님, 커밋 없음):

- `AGENTS.md` — Next.js 로컬 문서 우선 규칙.
- `node_modules/next/dist/docs/` 중 관련 문서: 서버 컴포넌트에서 `params: Promise<{...}>` 처리, `"use server"` 서버 액션 + `useActionState`, `revalidatePath`, `redirect`.
- 본 계획의 패턴은 기존 코드를 그대로 따른다:
  - 서버 액션 + RPC/직접쓰기: `src/features/missions/actions/complete-mission.ts`, `src/features/account/actions/profile.ts`
  - 클라이언트 폼 + `useActionState`: `src/features/missions/components/goal-list.tsx`
  - jsdom 컴포넌트 테스트(createRoot/act/I18nProvider): `src/features/estate/__tests__/estate-shop-client.test.tsx`
  - 순수 도메인 TDD: `src/features/missions/__tests__/goals.test.ts`

**검증 명령(이 플랜 전체에서 사용):**
- 테스트: `npm run test`
- 린트: `npm run lint`
- 빌드: `npm run build`

**커밋 규칙:** 사용자가 푸시를 요청하기 전에는 푸시하지 않는다. 각 Task 끝에서만 커밋한다.

---

## File Structure

**신규 (Create):**

- `src/features/account/domain/contribution.ts` — 잔디 그래프 순수 계산: `seoulDayLabel`, `contributionLevel`, `buildContributionGraph`. (point_events → 주×요일 격자 + 스트릭)
- `src/features/account/domain/achievements.ts` — 보유 데이터에서 배지(성취) 파생: `deriveAchievements`.
- `src/features/account/domain/profile-edit.ts` — 편집 입력 검증(순수): `validateProfileEdit`.
- `src/features/account/__tests__/contribution.test.ts` — 잔디 도메인 테스트.
- `src/features/account/__tests__/achievements.test.ts` — 배지 도메인 테스트.
- `src/features/account/__tests__/profile-edit.test.ts` — 편집 검증 테스트.
- `src/features/account/__tests__/profile-hero.test.tsx` — 헤더 렌더 스모크 테스트(jsdom).
- `src/features/account/__tests__/contribution-graph.test.tsx` — 잔디 컴포넌트 렌더 테스트(jsdom).
- `src/features/account/actions/edit-profile.ts` — 핸들·소개·이름 편집 서버 액션.
- `src/features/account/components/profile-hero.tsx` — 인스타형 헤더(아바타+레벨 링, 스탯 줄, 핸들, 소개, 편집 버튼).
- `src/features/account/components/achievement-highlights.tsx` — 원형 배지 하이라이트 줄.
- `src/features/account/components/contribution-graph.tsx` — 에너지 잔디 격자.
- `src/features/account/components/contribution-graph.module.css` — 잔디 셀 레벨 색(다크모드 포함).
- `src/features/account/components/profile-edit-form.tsx` — 편집 폼(클라이언트).
- `src/app/[locale]/me/edit/page.tsx` — 편집 라우트(서버 컴포넌트).
- `docs/superpowers/migrations/2026-06-26-profile-bio-handle.sql` — 마이그레이션 기록.

**수정 (Modify):**

- `src/features/account/domain/types.ts` — `AccountProfile`에 `handle`, `bio` 추가.
- `src/features/account/domain/points.ts` — `countMissionCheckIns` 추가.
- `src/features/account/__tests__/points.test.ts` — `countMissionCheckIns` 테스트 추가.
- `src/features/account/data/account-dal.ts` — `getCurrentProfile` select에 `handle`, `bio` 추가.
- `src/app/[locale]/me/page.tsx` — 새 레이아웃으로 재구성(헤더/잔디/배지/기존 카드).
- `src/i18n/messages/ko.ts` + `src/i18n/messages/en.ts` — `me.profile`, `me.edit`, `me.graph`, `me.achievements` 블록 추가.

**삭제 (Delete):**

- `src/features/account/components/profile-summary.tsx` — `ProfileHero`로 대체(유일 소비자는 `/me`).

---

## Task 1: DB 마이그레이션 — profiles에 handle·bio 추가

**Files:**
- Create: `docs/superpowers/migrations/2026-06-26-profile-bio-handle.sql`
- DB: Supabase 프로젝트 `cems` (ref `zvuqmagfpdyrrzyjntue`)에 마이그레이션 적용

기존 `profiles`는 온보딩에서 own-row upsert가 허용된다(`saveProfileAction`이 `.upsert()` 사용). 따라서 핸들·소개도 직접 업데이트로 처리한다. 핸들 유일성은 부분 unique 인덱스로, 형식은 CHECK로 보장한다. affiliation(`school_id`/`group_id`) 변경은 기존 불변 트리거가 막으므로, 이 마이그레이션은 비경제·비-affiliation 컬럼만 추가한다.

- [ ] **Step 1: 마이그레이션 SQL 파일 작성**

`docs/superpowers/migrations/2026-06-26-profile-bio-handle.sql`:

```sql
-- profiles: add editable handle (@id) + one-line bio.
-- Non-economic, non-affiliation columns. Existing immutable-affiliation
-- trigger still guards school_id/group_id; own-row updates already allowed.
alter table public.profiles
  add column if not exists handle text,
  add column if not exists bio text;

-- handle is optional but unique when present, lowercased a-z0-9_ 3..20.
create unique index if not exists profiles_handle_key
  on public.profiles (handle)
  where handle is not null;

alter table public.profiles
  add constraint profiles_handle_fmt
    check (handle is null or handle ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 80);
```

- [ ] **Step 2: 마이그레이션 적용**

Supabase MCP `apply_migration`(name: `profile_bio_handle`)로 위 SQL을 적용한다. (로컬 supabase CLI가 없으므로 MCP 사용 — 기존 마이그레이션들과 동일한 경로.)

- [ ] **Step 3: 적용 검증**

`execute_sql`로 확인:
```sql
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='profiles'
  and column_name in ('handle','bio')
order by column_name;
```
Expected: `bio | text` 와 `handle | text` 두 행.

형식 제약 동작 확인(롤백 트랜잭션):
```sql
begin;
-- 잘못된 핸들은 거부되어야 함
do $$ begin
  begin
    update public.profiles set handle='Bad Handle!' where false;
  exception when others then null; end;
end $$;
rollback;
```
(테스트 계정 데이터를 건드리지 않도록 `where false` 사용 — 제약은 인서트/업데이트 시점 평가이므로 실제 검증은 Task 6 DB 스크립트에서 수행.)

- [ ] **Step 4: 커밋**

```bash
git add docs/superpowers/migrations/2026-06-26-profile-bio-handle.sql
git commit -m "feat(profile): add handle and bio columns to profiles"
```

---

## Task 2: i18n 문자열 추가 (ko + en)

**Files:**
- Modify: `src/i18n/messages/ko.ts:318-353` (`me` 블록)
- Modify: `src/i18n/messages/en.ts:317-352` (`me` 블록)

`Messages` 타입은 `typeof koMessages`에서 자동 생성되므로(`src/i18n/messages/types.ts`), ko.ts에 키를 추가하면 en.ts에도 동일 모양이 강제된다. 두 파일을 함께 수정해야 빌드가 통과한다.

- [ ] **Step 1: ko.ts `me` 블록에 4개 하위 블록 추가**

`src/i18n/messages/ko.ts`의 `me: { ... }` 안, 기존 `contribution: { ... },` 다음에 추가:

```ts
    profile: {
      edit: "프로필 편집",
      handleFallback: "@아이디 추가",
      noBio: "한 줄 소개를 추가해보세요",
      statPoints: "포인트",
      statLevel: "레벨",
      statStreak: "연속일",
    },
    edit: {
      title: "프로필 편집",
      displayName: "이름",
      handle: "아이디",
      handleHint: "영문 소문자·숫자·밑줄 3~20자",
      bio: "한 줄 소개",
      bioHint: "최대 80자",
      save: "저장",
      saving: "저장 중…",
      cancel: "취소",
      errorDisplayNameRequired: "이름을 입력하세요.",
      errorDisplayNameTooLong: "이름이 너무 깁니다.",
      errorHandleInvalid: "아이디 형식이 올바르지 않습니다.",
      errorHandleTaken: "이미 사용 중인 아이디입니다.",
      errorBioTooLong: "소개가 너무 깁니다.",
      errorUnknown: "저장에 실패했습니다.",
    },
    graph: {
      title: "에너지 잔디",
      summary: "활동 {days}일 · 최고 연속 {longest}일",
      less: "적음",
      more: "많음",
      empty: "아직 심은 잔디가 없어요. QR 미션을 인증해 잔디를 심어보세요.",
      cell: "{date} · {points}",
      cellEmpty: "{date} · 활동 없음",
    },
    achievements: {
      title: "배지",
      lockedHint: "곧 공개",
      campusSaver: "캠퍼스 절약가",
      energyHero: "에너지 히어로",
      gridGuardian: "그리드 가디언",
      streak7: "7일 연속",
      checkIn10: "인증 10회",
      topStudent: "최우수 학생",
    },
```

- [ ] **Step 2: en.ts `me` 블록에 동일 키 추가(영문)**

`src/i18n/messages/en.ts`의 `me: { ... }` 안, 기존 `contribution: { ... },` 다음에 추가:

```ts
    profile: {
      edit: "Edit profile",
      handleFallback: "Add @handle",
      noBio: "Add a one-line bio",
      statPoints: "Points",
      statLevel: "Level",
      statStreak: "Streak",
    },
    edit: {
      title: "Edit profile",
      displayName: "Name",
      handle: "Handle",
      handleHint: "Lowercase letters, numbers, underscore, 3–20 chars",
      bio: "Bio",
      bioHint: "Up to 80 characters",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      errorDisplayNameRequired: "Please enter a name.",
      errorDisplayNameTooLong: "Name is too long.",
      errorHandleInvalid: "Handle format is invalid.",
      errorHandleTaken: "That handle is already taken.",
      errorBioTooLong: "Bio is too long.",
      errorUnknown: "Could not save. Please try again.",
    },
    graph: {
      title: "Energy garden",
      summary: "{days} active days · {longest}-day best streak",
      less: "Less",
      more: "More",
      empty: "No grass planted yet. Verify a QR mission to plant some.",
      cell: "{date} · {points}",
      cellEmpty: "{date} · No activity",
    },
    achievements: {
      title: "Badges",
      lockedHint: "Coming soon",
      campusSaver: "Campus Saver",
      energyHero: "Energy Hero",
      gridGuardian: "Grid Guardian",
      streak7: "7-day streak",
      checkIn10: "10 check-ins",
      topStudent: "Top Student",
    },
```

- [ ] **Step 3: 타입/빌드 확인**

Run: `npm run build`
Expected: PASS (ko/en 모양 일치 → 타입 에러 없음). 만약 en.ts에 누락 키가 있으면 TS가 에러를 낸다 — 그 키를 채운다.

- [ ] **Step 4: 커밋**

```bash
git add src/i18n/messages/ko.ts src/i18n/messages/en.ts
git commit -m "feat(i18n): add profile redesign, edit, graph, achievements strings"
```

---

## Task 3: AccountProfile + getCurrentProfile에 handle·bio 반영

**Files:**
- Modify: `src/features/account/domain/types.ts:16-21`
- Modify: `src/features/account/data/account-dal.ts:46-68`

- [ ] **Step 1: `AccountProfile` 타입 확장**

`src/features/account/domain/types.ts`의 `AccountProfile`를 교체:

```ts
export type AccountProfile = {
  userId: string;
  displayName: string;
  schoolId: string;
  groupId: string;
  handle: string | null;
  bio: string | null;
};
```

- [ ] **Step 2: `getCurrentProfile` select + 매핑 확장**

`src/features/account/data/account-dal.ts`의 `getCurrentProfile` 내부 select와 반환을 교체:

```ts
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, school_id, group_id, handle, bio")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw new Error(`Failed to load profile: ${error.message}`);
    if (!data) return null;

    return {
      userId: data.id,
      displayName: data.display_name,
      schoolId: data.school_id,
      groupId: data.group_id,
      handle: data.handle ?? null,
      bio: data.bio ?? null,
    };
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: PASS. (`saveProfileAction`의 upsert는 handle/bio를 안 넣어도 null 기본값이므로 영향 없음.)

- [ ] **Step 4: 커밋**

```bash
git add src/features/account/domain/types.ts src/features/account/data/account-dal.ts
git commit -m "feat(account): load handle and bio in current profile"
```

---

## Task 4: 편집 입력 검증 도메인 (TDD)

**Files:**
- Create: `src/features/account/domain/profile-edit.ts`
- Test: `src/features/account/__tests__/profile-edit.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/account/__tests__/profile-edit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateProfileEdit } from "../domain/profile-edit";

describe("validateProfileEdit", () => {
  it("trims and accepts a valid draft, lowercasing and stripping @ from handle", () => {
    const r = validateProfileEdit({
      displayName: "  전우환 ",
      handle: " @Eco_Hwan ",
      bio: "  계단만 씁니다  ",
    });
    expect(r).toEqual({
      ok: true,
      value: { displayName: "전우환", handle: "eco_hwan", bio: "계단만 씁니다" },
    });
  });

  it("treats empty handle and bio as null", () => {
    const r = validateProfileEdit({ displayName: "철수", handle: "", bio: "" });
    expect(r).toEqual({
      ok: true,
      value: { displayName: "철수", handle: null, bio: null },
    });
  });

  it("rejects an empty display name", () => {
    expect(validateProfileEdit({ displayName: "   ", handle: "", bio: "" })).toEqual({
      ok: false,
      error: "display-name-required",
    });
  });

  it("rejects a display name longer than 30 chars", () => {
    expect(
      validateProfileEdit({ displayName: "a".repeat(31), handle: "", bio: "" }),
    ).toEqual({ ok: false, error: "display-name-too-long" });
  });

  it("rejects a too-short handle", () => {
    expect(
      validateProfileEdit({ displayName: "철수", handle: "ab", bio: "" }),
    ).toEqual({ ok: false, error: "handle-invalid" });
  });

  it("rejects a handle with illegal characters", () => {
    expect(
      validateProfileEdit({ displayName: "철수", handle: "bad handle", bio: "" }),
    ).toEqual({ ok: false, error: "handle-invalid" });
  });

  it("rejects a bio longer than 80 chars", () => {
    expect(
      validateProfileEdit({ displayName: "철수", handle: "", bio: "a".repeat(81) }),
    ).toEqual({ ok: false, error: "bio-too-long" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- profile-edit`
Expected: FAIL — `validateProfileEdit` 미정의.

- [ ] **Step 3: 최소 구현**

`src/features/account/domain/profile-edit.ts`:

```ts
export type ProfileEditDraft = {
  displayName: string;
  handle: string;
  bio: string;
};

export type ProfileEditError =
  | "display-name-required"
  | "display-name-too-long"
  | "handle-invalid"
  | "bio-too-long";

export type ProfileEditResult =
  | {
      ok: true;
      value: { displayName: string; handle: string | null; bio: string | null };
    }
  | { ok: false; error: ProfileEditError };

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const DISPLAY_NAME_MAX = 30;
const BIO_MAX = 80;

export function validateProfileEdit(draft: ProfileEditDraft): ProfileEditResult {
  const displayName = draft.displayName.trim();
  if (displayName.length === 0) return { ok: false, error: "display-name-required" };
  if (displayName.length > DISPLAY_NAME_MAX) {
    return { ok: false, error: "display-name-too-long" };
  }

  const handleRaw = draft.handle.trim().replace(/^@/, "").toLowerCase();
  const handle = handleRaw === "" ? null : handleRaw;
  if (handle !== null && !HANDLE_RE.test(handle)) {
    return { ok: false, error: "handle-invalid" };
  }

  const bioTrim = draft.bio.trim();
  if (bioTrim.length > BIO_MAX) return { ok: false, error: "bio-too-long" };
  const bio = bioTrim === "" ? null : bioTrim;

  return { ok: true, value: { displayName, handle, bio } };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- profile-edit`
Expected: PASS (7 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/features/account/domain/profile-edit.ts src/features/account/__tests__/profile-edit.test.ts
git commit -m "feat(account): add profile-edit validation domain"
```

---

## Task 5: 편집 서버 액션

**Files:**
- Create: `src/features/account/actions/edit-profile.ts`

온보딩(`profile.ts`)과 동일하게 own-row 직접 업데이트를 쓴다. 핸들 충돌은 부분 unique 인덱스가 막고, Postgres unique 위반 코드 `23505`를 잡아 `handle-taken`으로 매핑한다.

- [ ] **Step 1: 액션 작성**

`src/features/account/actions/edit-profile.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "../supabase/server";
import { getCurrentUser } from "../data/account-dal";
import {
  validateProfileEdit,
  type ProfileEditError,
} from "../domain/profile-edit";

export type EditProfileState = {
  error: ProfileEditError | "handle-taken" | "unknown" | null;
};

export async function editProfileAction(
  _prevState: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const locale = normalizeLocale(formData.get("locale"));
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me/edit`);

  const validation = validateProfileEdit({
    displayName: String(formData.get("displayName") ?? ""),
    handle: String(formData.get("handle") ?? ""),
    bio: String(formData.get("bio") ?? ""),
  });
  if (!validation.ok) return { error: validation.error };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: validation.value.displayName,
      handle: validation.value.handle,
      bio: validation.value.bio,
    })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation → the handle index collided.
    if (error.code === "23505") return { error: "handle-taken" };
    return { error: "unknown" };
  }

  revalidatePath(`/${locale}/me`);
  redirect(`/${locale}/me`);
}
```

- [ ] **Step 2: 빌드/린트 확인**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/features/account/actions/edit-profile.ts
git commit -m "feat(account): add edit-profile server action"
```

---

## Task 6: 편집 폼 + /me/edit 라우트

**Files:**
- Create: `src/features/account/components/profile-edit-form.tsx`
- Create: `src/app/[locale]/me/edit/page.tsx`

- [ ] **Step 1: 편집 폼(클라이언트) 작성**

`src/features/account/components/profile-edit-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import {
  editProfileAction,
  type EditProfileState,
} from "../actions/edit-profile";

const initialState: EditProfileState = { error: null };

export function ProfileEditForm({
  displayName,
  handle,
  bio,
}: {
  displayName: string;
  handle: string | null;
  bio: string | null;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.edit;
  const [state, formAction, pending] = useActionState(
    editProfileAction,
    initialState,
  );

  const errorText: Record<NonNullable<EditProfileState["error"]>, string> = {
    "display-name-required": copy.errorDisplayNameRequired,
    "display-name-too-long": copy.errorDisplayNameTooLong,
    "handle-invalid": copy.errorHandleInvalid,
    "handle-taken": copy.errorHandleTaken,
    "bio-too-long": copy.errorBioTooLong,
    unknown: copy.errorUnknown,
  };

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
    >
      <input type="hidden" name="locale" value={locale} />

      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">{copy.displayName}</span>
        <input
          name="displayName"
          defaultValue={displayName}
          maxLength={30}
          required
          className="h-10 rounded-lg border border-line bg-inset px-3 text-sm text-ink"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">{copy.handle}</span>
        <input
          name="handle"
          defaultValue={handle ?? ""}
          placeholder="@eco_hwan"
          maxLength={21}
          className="h-10 rounded-lg border border-line bg-inset px-3 text-sm text-ink"
        />
        <span className="text-xs text-ink-subtle">{copy.handleHint}</span>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">{copy.bio}</span>
        <textarea
          name="bio"
          defaultValue={bio ?? ""}
          maxLength={80}
          rows={2}
          className="rounded-lg border border-line bg-inset px-3 py-2 text-sm text-ink"
        />
        <span className="text-xs text-ink-subtle">{copy.bioHint}</span>
      </label>

      {state.error ? (
        <p className="text-sm font-medium text-overuse">
          {errorText[state.error]}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60"
        >
          {pending ? copy.saving : copy.save}
        </button>
        <Link
          href={`/${locale}/me`}
          className="h-10 rounded-lg border border-line px-4 text-sm font-medium leading-10 text-ink-muted"
        >
          {copy.cancel}
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: /me/edit 라우트(서버 컴포넌트) 작성**

`src/app/[locale]/me/edit/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { ProfileEditForm } from "@/features/account/components/profile-edit-form";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type EditPageProps = { params: Promise<{ locale: string }> };

export default async function ProfileEditPage({ params }: EditPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me/edit`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}/me`} className="text-sm font-medium text-ink-muted">
            ← {messages.me.title}
          </Link>
          <h1 className="text-sm font-semibold text-ink">{messages.me.edit.title}</h1>
        </header>
        <ProfileEditForm
          displayName={profile.displayName}
          handle={profile.handle}
          bio={profile.bio}
        />
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: PASS. 라우트 목록에 `/[locale]/me/edit` 가 보여야 한다.

- [ ] **Step 4: 커밋**

```bash
git add src/features/account/components/profile-edit-form.tsx "src/app/[locale]/me/edit/page.tsx"
git commit -m "feat(profile): add profile edit route and form"
```

---

## Task 7: 잔디 그래프 + 인증 횟수 도메인 (TDD)

**Files:**
- Create: `src/features/account/domain/contribution.ts`
- Test: `src/features/account/__tests__/contribution.test.ts`
- Modify: `src/features/account/domain/points.ts`
- Modify: `src/features/account/__tests__/points.test.ts`

서울은 영구 UTC+9(DST 없음)이므로 ISO 타임스탬프를 +9시간 시프트한 UTC 날짜로 "서울 달력일"을 결정적으로 계산한다(외부 라이브러리·Intl 불필요 → 테스트 가능). 진하기는 **그날 획득 포인트 합**으로 0~4단계.

- [ ] **Step 1: 잔디 도메인 실패 테스트 작성**

`src/features/account/__tests__/contribution.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PointEvent } from "../domain/points";
import {
  buildContributionGraph,
  contributionLevel,
  seoulDayLabel,
} from "../domain/contribution";

function ev(points: number, createdAt: string): PointEvent {
  return { id: createdAt, userId: "u", points, reason: "qr:x", periodLabel: "", createdAt };
}

describe("seoulDayLabel", () => {
  it("shifts UTC to Asia/Seoul (UTC+9) calendar day", () => {
    // 15:00Z is exactly Seoul midnight → rolls to next day.
    expect(seoulDayLabel("2026-06-26T15:30:00Z")).toBe("2026-06-27");
    expect(seoulDayLabel("2026-06-26T14:59:00Z")).toBe("2026-06-26");
  });
});

describe("contributionLevel", () => {
  it("maps daily points to 0..4 buckets", () => {
    expect(contributionLevel(0)).toBe(0);
    expect(contributionLevel(1)).toBe(1);
    expect(contributionLevel(79)).toBe(1);
    expect(contributionLevel(80)).toBe(2);
    expect(contributionLevel(199)).toBe(2);
    expect(contributionLevel(200)).toBe(3);
    expect(contributionLevel(399)).toBe(3);
    expect(contributionLevel(400)).toBe(4);
    expect(contributionLevel(5000)).toBe(4);
  });
});

describe("buildContributionGraph", () => {
  it("produces a weeks x 7 grid ending in the week of today", () => {
    const g = buildContributionGraph([], { todayLabel: "2026-06-26", weeks: 4 });
    expect(g.weeks).toHaveLength(4);
    for (const week of g.weeks) expect(week).toHaveLength(7);
    // last column's last present day is today (2026-06-26 is a Friday → index 5)
    const lastWeek = g.weeks[3];
    expect(lastWeek[5].date).toBe("2026-06-26");
    expect(lastWeek[5].future).toBe(false);
    expect(lastWeek[6].future).toBe(true); // Saturday after today
  });

  it("sums same-day points and assigns level + totals", () => {
    const events = [
      ev(50, "2026-06-26T01:00:00Z"), // Seoul 2026-06-26
      ev(50, "2026-06-26T02:00:00Z"), // Seoul 2026-06-26 → day total 100 → level 2
      ev(30, "2026-06-24T01:00:00Z"), // Seoul 2026-06-24 → level 1
    ];
    const g = buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 4 });
    const cells = g.weeks.flat();
    const d26 = cells.find((c) => c.date === "2026-06-26");
    const d24 = cells.find((c) => c.date === "2026-06-24");
    expect(d26?.points).toBe(100);
    expect(d26?.level).toBe(2);
    expect(d24?.level).toBe(1);
    expect(g.totalPoints).toBe(180);
    expect(g.activeDays).toBe(2);
  });

  it("computes current and longest streaks (today active)", () => {
    const events = [
      ev(40, "2026-06-24T01:00:00Z"),
      ev(40, "2026-06-25T01:00:00Z"),
      ev(40, "2026-06-26T01:00:00Z"),
    ];
    const g = buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 6 });
    expect(g.currentStreak).toBe(3);
    expect(g.longestStreak).toBe(3);
  });

  it("keeps current streak through a still-inactive today (grace), counting yesterday", () => {
    const events = [
      ev(40, "2026-06-24T01:00:00Z"),
      ev(40, "2026-06-25T01:00:00Z"),
    ];
    const g = buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 6 });
    expect(g.currentStreak).toBe(2);
  });

  it("returns zero streaks and empty totals for no events", () => {
    const g = buildContributionGraph([], { todayLabel: "2026-06-26", weeks: 4 });
    expect(g.currentStreak).toBe(0);
    expect(g.longestStreak).toBe(0);
    expect(g.totalPoints).toBe(0);
    expect(g.activeDays).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- contribution`
Expected: FAIL — `contribution` 모듈 미정의.

- [ ] **Step 3: 잔디 도메인 구현**

`src/features/account/domain/contribution.ts`:

```ts
import type { PointEvent } from "./points";

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Points-per-day thresholds → level 0..4. Tunable.
const THRESHOLDS = [80, 200, 400] as const;

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionCell = {
  date: string; // YYYY-MM-DD (Asia/Seoul)
  points: number;
  level: ContributionLevel;
  future: boolean; // after today (trailing cells in the current week)
};

export type ContributionGraph = {
  weeks: ContributionCell[][]; // columns; each is 7 cells Sun..Sat
  monthLabels: { weekIndex: number; month: number }[];
  totalPoints: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
};

export function seoulDayLabel(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + SEOUL_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function contributionLevel(points: number): ContributionLevel {
  if (points <= 0) return 0;
  if (points < THRESHOLDS[0]) return 1;
  if (points < THRESHOLDS[1]) return 2;
  if (points < THRESHOLDS[2]) return 3;
  return 4;
}

// Treat a YYYY-MM-DD as a UTC midnight instant for deterministic day math.
function labelToUtc(label: string): number {
  return Date.parse(`${label}T00:00:00Z`);
}
function utcToLabel(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function addDays(label: string, delta: number): string {
  return utcToLabel(labelToUtc(label) + delta * DAY_MS);
}
function dayOfWeek(label: string): number {
  return new Date(labelToUtc(label)).getUTCDay(); // 0=Sun..6=Sat
}

export function buildContributionGraph(
  events: readonly PointEvent[],
  options: { todayLabel: string; weeks: number },
): ContributionGraph {
  const { todayLabel, weeks } = options;

  // Sum points per Seoul day.
  const byDay = new Map<string, number>();
  for (const e of events) {
    const day = seoulDayLabel(e.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + Math.max(0, e.points));
  }

  // Grid start = Sunday of the column that is (weeks-1) weeks before today's week.
  const todaySunday = addDays(todayLabel, -dayOfWeek(todayLabel));
  const start = addDays(todaySunday, -(weeks - 1) * 7);

  const grid: ContributionCell[][] = [];
  const monthLabels: { weekIndex: number; month: number }[] = [];
  let prevMonth = -1;
  let totalPoints = 0;
  let activeDays = 0;

  for (let w = 0; w < weeks; w += 1) {
    const week: ContributionCell[] = [];
    const columnSunday = addDays(start, w * 7);
    const month = Number(columnSunday.slice(5, 7));
    if (month !== prevMonth) {
      monthLabels.push({ weekIndex: w, month });
      prevMonth = month;
    }
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(columnSunday, d);
      const future = date > todayLabel;
      const points = future ? 0 : byDay.get(date) ?? 0;
      if (!future && points > 0) {
        totalPoints += points;
        activeDays += 1;
      }
      week.push({ date, points, level: contributionLevel(points), future });
    }
    grid.push(week);
  }

  const { currentStreak, longestStreak } = computeStreaks(byDay, todayLabel);

  return {
    weeks: grid,
    monthLabels,
    totalPoints,
    activeDays,
    currentStreak,
    longestStreak,
  };
}

function computeStreaks(
  byDay: ReadonlyMap<string, number>,
  todayLabel: string,
): { currentStreak: number; longestStreak: number } {
  const active = new Set<string>();
  for (const [day, pts] of byDay) if (pts > 0) active.add(day);

  // Current streak: walk back from today; allow today to be inactive (grace).
  let cursor = active.has(todayLabel) ? todayLabel : addDays(todayLabel, -1);
  let currentStreak = 0;
  while (active.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest streak: scan sorted active days.
  const sorted = [...active].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    prev = day;
  }

  return { currentStreak, longestStreak };
}
```

- [ ] **Step 4: 잔디 테스트 통과 확인**

Run: `npm run test -- contribution`
Expected: PASS.

- [ ] **Step 5: `countMissionCheckIns` 실패 테스트 추가**

`src/features/account/__tests__/points.test.ts` 파일 끝에 추가(기존 import에 `countMissionCheckIns` 합치고, 없으면 새 import 추가):

```ts
import { countMissionCheckIns } from "../domain/points";

describe("countMissionCheckIns", () => {
  it("counts only qr:<code> mission events", () => {
    const events = [
      { id: "1", userId: "u", points: 50, reason: "qr:stairs", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
      { id: "2", userId: "u", points: 30, reason: "qr:tumbler", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
      { id: "3", userId: "u", points: 20, reason: "goal:daily-1", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
      { id: "4", userId: "u", points: 10, reason: "verified-savings", periodLabel: "", createdAt: "2026-06-26T00:00:00Z" },
    ];
    expect(countMissionCheckIns(events)).toBe(2);
  });

  it("returns 0 for no events", () => {
    expect(countMissionCheckIns([])).toBe(0);
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm run test -- points`
Expected: FAIL — `countMissionCheckIns` 미정의.

- [ ] **Step 7: `countMissionCheckIns` 구현**

`src/features/account/domain/points.ts` 파일 끝에 추가:

```ts
import { parsePointEventReason } from "./point-reason";

export function countMissionCheckIns(events: readonly PointEvent[]): number {
  return events.reduce(
    (count, event) =>
      parsePointEventReason(event.reason).kind === "mission" ? count + 1 : count,
    0,
  );
}
```

(파일 상단의 기존 import들과 함께 두되, `point-reason` import가 중복되지 않게 한다.)

- [ ] **Step 8: 테스트 통과 확인**

Run: `npm run test -- points contribution`
Expected: PASS.

- [ ] **Step 9: 커밋**

```bash
git add src/features/account/domain/contribution.ts src/features/account/domain/points.ts src/features/account/__tests__/contribution.test.ts src/features/account/__tests__/points.test.ts
git commit -m "feat(account): add contribution-graph and check-in-count domain"
```

---

## Task 8: 배지(성취) 도메인 (TDD)

**Files:**
- Create: `src/features/account/domain/achievements.ts`
- Test: `src/features/account/__tests__/achievements.test.ts`

보유 데이터(레벨, 최장 스트릭, 인증 횟수)에서 성취를 파생한다. `top-student`는 미래(관리자 부여) 슬롯으로 항상 잠금.

- [ ] **Step 1: 실패 테스트 작성**

`src/features/account/__tests__/achievements.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveAchievements } from "../domain/achievements";

describe("deriveAchievements", () => {
  it("returns the fixed 6-badge set in order", () => {
    const list = deriveAchievements({ level: 1, longestStreak: 0, totalCheckIns: 0 });
    expect(list.map((a) => a.key)).toEqual([
      "campus-saver",
      "energy-hero",
      "grid-guardian",
      "streak-7",
      "check-in-10",
      "top-student",
    ]);
  });

  it("campus-saver is always earned; top-student is always locked", () => {
    const list = deriveAchievements({ level: 1, longestStreak: 0, totalCheckIns: 0 });
    const byKey = Object.fromEntries(list.map((a) => [a.key, a]));
    expect(byKey["campus-saver"]).toEqual({ key: "campus-saver", earned: true, locked: false });
    expect(byKey["top-student"]).toEqual({ key: "top-student", earned: false, locked: true });
  });

  it("unlocks level, streak and check-in milestones at their thresholds", () => {
    const list = deriveAchievements({ level: 10, longestStreak: 7, totalCheckIns: 10 });
    const byKey = Object.fromEntries(list.map((a) => [a.key, a.earned]));
    expect(byKey["energy-hero"]).toBe(true); // level >= 5
    expect(byKey["grid-guardian"]).toBe(true); // level >= 10
    expect(byKey["streak-7"]).toBe(true); // longestStreak >= 7
    expect(byKey["check-in-10"]).toBe(true); // totalCheckIns >= 10
  });

  it("keeps milestones locked below threshold", () => {
    const list = deriveAchievements({ level: 4, longestStreak: 6, totalCheckIns: 9 });
    const byKey = Object.fromEntries(list.map((a) => [a.key, a.earned]));
    expect(byKey["energy-hero"]).toBe(false);
    expect(byKey["grid-guardian"]).toBe(false);
    expect(byKey["streak-7"]).toBe(false);
    expect(byKey["check-in-10"]).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- achievements`
Expected: FAIL — 모듈 미정의.

- [ ] **Step 3: 구현**

`src/features/account/domain/achievements.ts`:

```ts
export type AchievementKey =
  | "campus-saver"
  | "energy-hero"
  | "grid-guardian"
  | "streak-7"
  | "check-in-10"
  | "top-student";

export type Achievement = {
  key: AchievementKey;
  earned: boolean;
  locked: boolean; // future / admin-awarded, not yet available
};

export function deriveAchievements(input: {
  level: number;
  longestStreak: number;
  totalCheckIns: number;
}): Achievement[] {
  const { level, longestStreak, totalCheckIns } = input;
  return [
    { key: "campus-saver", earned: true, locked: false },
    { key: "energy-hero", earned: level >= 5, locked: false },
    { key: "grid-guardian", earned: level >= 10, locked: false },
    { key: "streak-7", earned: longestStreak >= 7, locked: false },
    { key: "check-in-10", earned: totalCheckIns >= 10, locked: false },
    { key: "top-student", earned: false, locked: true },
  ];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- achievements`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/features/account/domain/achievements.ts src/features/account/__tests__/achievements.test.ts
git commit -m "feat(account): add achievements derivation domain"
```

---

## Task 9: 잔디 그래프 컴포넌트

**Files:**
- Create: `src/features/account/components/contribution-graph.tsx`
- Create: `src/features/account/components/contribution-graph.module.css`
- Test: `src/features/account/__tests__/contribution-graph.test.tsx`

색은 "절약=초록" 테마(`--color-saving`)의 농도 단계로 CSS Module에 정의(다크모드 자동 대응). 모바일에서는 가로 스크롤. 접근성: 전체 `role="img"` + aria-label, 셀별 `title`.

- [ ] **Step 1: CSS Module 작성**

`src/features/account/components/contribution-graph.module.css`:

```css
.scroll {
  overflow-x: auto;
  scrollbar-width: thin;
}

.grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 1fr);
  gap: 3px;
  width: max-content;
}

.cell {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background: var(--color-inset);
}

.cell[data-future="true"] {
  background: transparent;
}

.level1 { background: color-mix(in srgb, var(--color-saving) 28%, transparent); }
.level2 { background: color-mix(in srgb, var(--color-saving) 52%, transparent); }
.level3 { background: color-mix(in srgb, var(--color-saving) 76%, transparent); }
.level4 { background: var(--color-saving); }

.legendCell {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}
```

- [ ] **Step 2: 컴포넌트 작성**

`src/features/account/components/contribution-graph.tsx`:

```tsx
"use client";

import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { ContributionGraph as Graph } from "../domain/contribution";
import styles from "./contribution-graph.module.css";

const LEVEL_CLASS = ["", styles.level1, styles.level2, styles.level3, styles.level4];

export function ContributionGraph({ graph }: { graph: Graph }) {
  const { locale, messages } = useI18n();
  const copy = messages.me.graph;

  const dateFmt = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });

  function cellTitle(date: string, points: number): string {
    const label = dateFmt.format(new Date(`${date}T00:00:00Z`));
    return points > 0
      ? interpolate(copy.cell, { date: label, points: formatPoints(locale, points) })
      : interpolate(copy.cellEmpty, { date: label });
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
        <span className="text-xs text-ink-subtle">
          {interpolate(copy.summary, {
            days: graph.activeDays,
            longest: graph.longestStreak,
          })}
        </span>
      </div>

      {graph.activeDays === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <>
          <div className={`mt-3 ${styles.scroll}`}>
            <div
              className={styles.grid}
              role="img"
              aria-label={interpolate(copy.summary, {
                days: graph.activeDays,
                longest: graph.longestStreak,
              })}
            >
              {graph.weeks.flatMap((week) =>
                week.map((cell) => (
                  <span
                    key={cell.date}
                    className={`${styles.cell} ${LEVEL_CLASS[cell.level]}`}
                    data-future={cell.future}
                    title={cell.future ? undefined : cellTitle(cell.date, cell.points)}
                  />
                )),
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-ink-subtle">
            <span>{copy.less}</span>
            <span className={`${styles.legendCell}`} style={{ background: "var(--color-inset)" }} />
            <span className={`${styles.legendCell} ${styles.level1}`} />
            <span className={`${styles.legendCell} ${styles.level2}`} />
            <span className={`${styles.legendCell} ${styles.level3}`} />
            <span className={`${styles.legendCell} ${styles.level4}`} />
            <span>{copy.more}</span>
          </div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 3: 렌더 테스트 작성**

`src/features/account/__tests__/contribution-graph.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { ContributionGraph } from "../components/contribution-graph";
import { buildContributionGraph } from "../domain/contribution";
import type { PointEvent } from "../domain/points";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("ContributionGraph", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  async function render(graph: ReturnType<typeof buildContributionGraph>) {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <ContributionGraph graph={graph} />
        </I18nProvider>,
      );
    });
  }

  it("renders the empty state when there is no activity", async () => {
    await render(buildContributionGraph([], { todayLabel: "2026-06-26", weeks: 4 }));
    expect(container.textContent).toContain(enMessages.me.graph.empty);
  });

  it("renders a grid of cells when there is activity", async () => {
    const events: PointEvent[] = [
      { id: "1", userId: "u", points: 100, reason: "qr:x", periodLabel: "", createdAt: "2026-06-26T01:00:00Z" },
    ];
    await render(buildContributionGraph(events, { todayLabel: "2026-06-26", weeks: 4 }));
    const cells = container.querySelectorAll('[title]');
    expect(cells.length).toBeGreaterThan(0);
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- contribution-graph`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/features/account/components/contribution-graph.tsx src/features/account/components/contribution-graph.module.css src/features/account/__tests__/contribution-graph.test.tsx
git commit -m "feat(profile): add energy garden contribution graph component"
```

---

## Task 10: 배지 하이라이트 컴포넌트

**Files:**
- Create: `src/features/account/components/achievement-highlights.tsx`

인스타 스토리 하이라이트형 원형 메달 줄. 획득=초록 링+아이콘, 미획득=흐림, 잠금(top-student)=자물쇠.

- [ ] **Step 1: 컴포넌트 작성**

`src/features/account/components/achievement-highlights.tsx`:

```tsx
"use client";

import { Award, Flame, Leaf, Lock, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { Achievement, AchievementKey } from "../domain/achievements";

const ICONS: Record<AchievementKey, typeof Leaf> = {
  "campus-saver": Leaf,
  "energy-hero": Sparkles,
  "grid-guardian": ShieldCheck,
  "streak-7": Flame,
  "check-in-10": Star,
  "top-student": Award,
};

export function AchievementHighlights({
  achievements,
}: {
  achievements: Achievement[];
}) {
  const { messages } = useI18n();
  const copy = messages.me.achievements;
  const names = copy as unknown as Record<string, string>;
  const nameKey: Record<AchievementKey, string> = {
    "campus-saver": "campusSaver",
    "energy-hero": "energyHero",
    "grid-guardian": "gridGuardian",
    "streak-7": "streak7",
    "check-in-10": "checkIn10",
    "top-student": "topStudent",
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{copy.title}</h2>
      <ul className="mt-3 flex gap-4 overflow-x-auto pb-1">
        {achievements.map((a) => {
          const Icon = a.locked ? Lock : ICONS[a.key];
          const active = a.earned && !a.locked;
          return (
            <li key={a.key} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <span
                className={[
                  "grid h-16 w-16 place-items-center rounded-full border-2",
                  active
                    ? "border-saving bg-saving-soft text-saving"
                    : "border-line bg-inset text-ink-subtle",
                ].join(" ")}
                aria-hidden="true"
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-center text-[11px] leading-tight text-ink-muted">
                {names[nameKey[a.key]]}
              </span>
              {a.locked ? (
                <span className="text-[10px] text-ink-subtle">{copy.lockedHint}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: 빌드/린트 확인**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/features/account/components/achievement-highlights.tsx
git commit -m "feat(profile): add achievement highlights row"
```

---

## Task 11: 인스타형 프로필 헤더 (ProfileHero)

**Files:**
- Create: `src/features/account/components/profile-hero.tsx`
- Test: `src/features/account/__tests__/profile-hero.test.tsx`

원형 아바타 + 레벨 진행 링(conic-gradient), 스탯 줄(총 포인트·레벨·연속일), 이름 + `@handle`, 칭호 + 소개, 편집 버튼. 레벨/칭호는 클라이언트에서 `getCharacterProgress(personalPoints)`로 계산(기존 `ProfileSummary`와 동일).

- [ ] **Step 1: 컴포넌트 작성**

`src/features/account/components/profile-hero.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { formatNumber, formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold tabular-nums text-ink">{value}</span>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  );
}

export function ProfileHero({
  displayName,
  handle,
  bio,
  personalPoints,
  currentStreak,
}: {
  displayName: string;
  handle: string | null;
  bio: string | null;
  personalPoints: number;
  currentStreak: number;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.profile;
  const progress = getCharacterProgress(personalPoints);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const ringPct = Math.round(progress.progressRate * 100);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-5">
        {/* Avatar with level-progress ring */}
        <span
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full p-[3px]"
          style={{
            background: `conic-gradient(var(--color-saving) ${ringPct}%, var(--color-line) 0)`,
          }}
        >
          <span className="grid h-full w-full place-items-center rounded-full bg-accent text-2xl font-bold text-on-accent">
            {initial}
          </span>
        </span>

        {/* Stats row */}
        <div className="flex flex-1 justify-around">
          <Stat value={formatNumber(locale, personalPoints)} label={copy.statPoints} />
          <Stat value={formatNumber(locale, progress.level)} label={copy.statLevel} />
          <Stat value={formatNumber(locale, currentStreak)} label={copy.statStreak} />
        </div>
      </div>

      <div className="mt-4">
        <h1 className="text-lg font-semibold text-ink">{displayName}</h1>
        <p className="text-sm text-ink-subtle">
          {handle ? `@${handle}` : copy.handleFallback}
        </p>
        <p className="mt-1 text-sm font-medium text-saving">
          {messages.character.titles[progress.titleKey]} ·{" "}
          {interpolate(messages.character.level, { level: progress.level })} ·{" "}
          {formatPoints(locale, personalPoints)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{bio ?? copy.noBio}</p>
      </div>

      <Link
        href={`/${locale}/me/edit`}
        className="mt-4 block rounded-lg border border-line py-2 text-center text-sm font-semibold text-ink"
      >
        {copy.edit}
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: 렌더 테스트 작성**

`src/features/account/__tests__/profile-hero.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { ProfileHero } from "../components/profile-hero";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("ProfileHero", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  it("renders name, handle, and the edit link", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <ProfileHero
            displayName="Woohwan"
            handle="eco_hwan"
            bio="Stairs only"
            personalPoints={2500}
            currentStreak={4}
          />
        </I18nProvider>,
      );
    });
    expect(container.textContent).toContain("Woohwan");
    expect(container.textContent).toContain("@eco_hwan");
    expect(container.textContent).toContain("Stairs only");
    const editLink = container.querySelector('a[href="/en/me/edit"]');
    expect(editLink).not.toBeNull();
  });

  it("falls back to placeholder copy when handle and bio are missing", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <I18nProvider locale="en" messages={enMessages}>
          <ProfileHero
            displayName="Chulsoo"
            handle={null}
            bio={null}
            personalPoints={0}
            currentStreak={0}
          />
        </I18nProvider>,
      );
    });
    expect(container.textContent).toContain(enMessages.me.profile.handleFallback);
    expect(container.textContent).toContain(enMessages.me.profile.noBio);
  });
});
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm run test -- profile-hero`
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/features/account/components/profile-hero.tsx src/features/account/__tests__/profile-hero.test.tsx
git commit -m "feat(profile): add instagram-style profile hero header"
```

---

## Task 12: /me 페이지 재구성 + ProfileSummary 제거

**Files:**
- Modify: `src/app/[locale]/me/page.tsx`
- Delete: `src/features/account/components/profile-summary.tsx`

서버에서 잔디/배지/스탯을 계산해 새 컴포넌트로 조립한다. `getMyPointEvents`가 이미 전량을 반환하므로 추가 쿼리 없음.

- [ ] **Step 1: /me 페이지 교체**

`src/app/[locale]/me/page.tsx` 전체를 교체:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { SignOutButton } from "@/features/account/components/sign-out-button";
import { ProfileHero } from "@/features/account/components/profile-hero";
import { AchievementHighlights } from "@/features/account/components/achievement-highlights";
import { ContributionGraph } from "@/features/account/components/contribution-graph";
import { PointsHistory } from "@/features/account/components/points-history";
import { EstateContribution } from "@/features/account/components/estate-contribution";
import { GoalList } from "@/features/missions/components/goal-list";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupEstateSubjectId,
  getGroupPointPool,
  getMyPointEvents,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
import { getGoalsWithProgress } from "@/features/missions/data/missions-dal";
import { buildContributionGraph, seoulDayLabel } from "@/features/account/domain/contribution";
import { deriveAchievements } from "@/features/account/domain/achievements";
import { countMissionCheckIns } from "@/features/account/domain/points";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type MePageProps = { params: Promise<{ locale: string }> };

const GRAPH_WEEKS = 26;

export default async function MePage({ params }: MePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, personalPoints, groupPool, events, goals, estateSubjectId] =
    await Promise.all([
      getMessages(locale),
      getPersonalPointTotal(profile.userId),
      getGroupPointPool(profile.groupId),
      getMyPointEvents(profile.userId),
      getGoalsWithProgress(profile.userId),
      getGroupEstateSubjectId(profile.groupId),
    ]);

  const todayLabel = seoulDayLabel(new Date().toISOString());
  const graph = buildContributionGraph(events, { todayLabel, weeks: GRAPH_WEEKS });
  const achievements = deriveAchievements({
    level: getCharacterProgress(personalPoints).level,
    longestStreak: graph.longestStreak,
    totalCheckIns: countMissionCheckIns(events),
  });

  const estateHref = estateSubjectId
    ? `/${locale}/subjects/${estateSubjectId}/estate`
    : `/${locale}`;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}`} className="text-sm font-medium text-ink-muted">
            ← {messages.me.backToMap}
          </Link>
          <SignOutButton />
        </header>
        <ProfileHero
          displayName={profile.displayName}
          handle={profile.handle}
          bio={profile.bio}
          personalPoints={personalPoints}
          currentStreak={graph.currentStreak}
        />
        <AchievementHighlights achievements={achievements} />
        <ContributionGraph graph={graph} />
        <GoalList goals={goals} />
        <EstateContribution
          personalPoints={personalPoints}
          groupPoolPoints={groupPool.earnedPoints}
          estateHref={estateHref}
        />
        <PointsHistory events={events} />
      </main>
    </CampusEnergyProviders>
  );
}
```

- [ ] **Step 2: 사용 안 하는 ProfileSummary 삭제**

```bash
git rm src/features/account/components/profile-summary.tsx
```

- [ ] **Step 3: 빌드 확인(잔여 참조 없음)**

Run: `npm run build`
Expected: PASS. `ProfileSummary` 참조가 남아 있으면 빌드가 실패하므로 그때 제거한다(유일 소비자는 이 페이지였음).

- [ ] **Step 4: 커밋**

```bash
git add "src/app/[locale]/me/page.tsx"
git commit -m "feat(profile): rebuild /me with hero, badges and energy garden"
```

---

## Task 13: 기존 카드 비주얼 정돈(경량) + 헤더 아이콘

**Files:**
- Modify: `src/features/missions/components/goal-list.tsx:76-84`
- Modify: `src/features/account/components/points-history.tsx:31-33`
- Modify: `src/features/account/components/estate-contribution.tsx:24-26`

새 헤더/잔디/배지와 톤을 맞추기 위해 섹션 제목에 lucide 아이콘 + 간격을 통일한다(기능 변경 없음, 기존 테스트 영향 없음).

- [ ] **Step 1: GoalList 섹션 헤더에 아이콘 추가**

`src/features/missions/components/goal-list.tsx` 상단 import에 추가:
```tsx
import { Target } from "lucide-react";
```
`GoalList`의 `<h2>`를 교체:
```tsx
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Target className="h-4 w-4 text-accent" aria-hidden="true" />
        {messages.me.goals.title}
      </h2>
```

- [ ] **Step 2: PointsHistory 섹션 헤더에 아이콘 추가**

`src/features/account/components/points-history.tsx` 상단 import에 추가:
```tsx
import { History } from "lucide-react";
```
`<h2>`를 교체:
```tsx
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <History className="h-4 w-4 text-accent" aria-hidden="true" />
        {me.history.title}
      </h2>
```

- [ ] **Step 3: EstateContribution 섹션 헤더에 아이콘 추가**

`src/features/account/components/estate-contribution.tsx` 상단 import에 추가:
```tsx
import { Sprout } from "lucide-react";
```
`<h2>`를 교체:
```tsx
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sprout className="h-4 w-4 text-saving" aria-hidden="true" />
        {copy.title}
      </h2>
```

- [ ] **Step 4: 테스트/빌드 확인**

Run: `npm run test && npm run build`
Expected: PASS (기존 a11y/컴포넌트 테스트 통과 — 텍스트는 그대로, 아이콘은 `aria-hidden`).

- [ ] **Step 5: 커밋**

```bash
git add src/features/missions/components/goal-list.tsx src/features/account/components/points-history.tsx src/features/account/components/estate-contribution.tsx
git commit -m "style(profile): unify section headers with icons"
```

---

## Task 14: 전체 검증 + DB 실측 + 문서 갱신

**Files:**
- Modify: `docs/working/current-state.md`
- Modify: `docs/working/meeting-notes.md`

- [ ] **Step 1: 자동 검증 일괄 실행**

Run:
```bash
npm run test
npm run lint
npm run build
```
Expected: Vitest 전체 PASS(신규: profile-edit 7, contribution(~9), points(+2), achievements 4, contribution-graph 2, profile-hero 2), ESLint 0 errors(기존 `game-preview.tsx` 경고 2개는 무관), 빌드 PASS. 라우트 목록에 `/[locale]/me`, `/[locale]/me/edit` 존재.

- [ ] **Step 2: DB 편집 RPC/제약 실측(자체 롤백)**

`it@naver.com` 등 실계정의 user_id로 핸들/소개 업데이트가 동작하고, 잘못된 핸들이 거부되며, affiliation 불변 트리거가 여전히 작동하는지 확인. `execute_sql`로 트랜잭션 안에서 검증 후 `rollback`(실데이터 보존):

```sql
begin;
-- 유효 업데이트 성공
update public.profiles set handle='eco_hwan', bio='계단만 씁니다'
  where id = (select id from auth.users where email='it@naver.com');
-- 잘못된 핸들 거부 확인
do $$ begin
  begin
    update public.profiles set handle='Bad!'
      where id = (select id from auth.users where email='it@naver.com');
    raise exception 'expected check violation';
  exception when check_violation then null; end;
end $$;
rollback;
```
Expected: 첫 업데이트 성공, 잘못된 핸들은 `check_violation`으로 거부, 롤백으로 잔여 변경 없음. (핸들 중복은 부분 unique 인덱스가 23505로 거부 — 두 행에 같은 핸들을 넣는 추가 트랜잭션으로 선택 검증.)

- [ ] **Step 3: HTTP/라이브 실측**

`npm run dev` 후(또는 배포 미리보기), 로그인 상태로:
- `/ko/me` 200, 헤더(아바타+스탯)·배지 줄·에너지 잔디·목표·이력 렌더.
- `/ko/me/edit` 200, 핸들/소개 저장 → `/ko/me`로 복귀하며 반영.
- 미로그인 시 `/ko/me`·`/ko/me/edit` → `/ko/login?next=…` 리다이렉트.
- 신규/희소 계정은 잔디 빈 상태(`me.graph.empty`) 노출 확인.

(맵 라우트 캡처는 기존처럼 타임아웃될 수 있으나 `/me`는 캔버스가 아니므로 스크린샷 가능. 불가 시 DOM/HTTP로 검증.)

- [ ] **Step 4: 문서 갱신**

`docs/working/current-state.md`의 "Actual Repository State"에 한 줄 추가: `/me` 인스타형 리디자인(ProfileHero+레벨 링, 스탯 줄, 핸들/소개 편집 `/me/edit`, 배지 하이라이트, point_events 기반 에너지 잔디[그날 포인트 진하기, 26주, 스트릭]) 구현, `profiles`에 `handle`/`bio` 컬럼 추가(마이그레이션 `profile_bio_handle`), `ProfileSummary` 제거. 검증 수치 기입.

`docs/working/meeting-notes.md`에 2026-06-26 항목 추가: 사용자가 개인 프로필을 인스타그램 느낌으로 강화 + 깃허브 잔디 가볍게 요청 → 편집 가능한 한 줄 소개·핸들 채택, 잔디 진하기=그날 획득 포인트, 헤더 스탯=총 포인트·레벨·연속일, 배지는 "최우수 학생" 등 관리자 수여를 **나중에** 하기로(지금은 파생 성취 + 잠금 슬롯만).

- [ ] **Step 5: 커밋**

```bash
git add docs/working/current-state.md docs/working/meeting-notes.md
git commit -m "docs: record personal profile instagram redesign session"
```

---

## Self-Review

**1. Spec coverage (사용자 요청 대비):**
- "디자인 강화 / 인스타 느낌" → Task 11 `ProfileHero`(아바타+레벨 링, 스탯 줄, 핸들/소개) + Task 10 배지 하이라이트 + Task 13 카드 톤 통일. ✅
- "깃허브 잔디 가볍게" → Task 7 도메인(그날 포인트 진하기, 스트릭) + Task 9 컴포넌트, 새 쿼리 없이 기존 `point_events` 재사용. ✅
- 편집 가능한 한 줄 소개·핸들(사용자 선택) → Task 1 마이그레이션 + Task 4~6 검증/액션/폼·라우트. ✅
- 헤더 스탯 총 포인트·레벨·연속일(사용자 선택 + 자연스러운 3번째) → Task 11. ✅
- 배지는 "나중에 최우수 학생 등 수여"(사용자 발화) → Task 8/10에서 파생 성취 + 잠금된 `top-student` 슬롯, 실제 수여는 범위 밖으로 문서화. ✅

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드/SQL/명령 + 기대 출력 포함. "TBD/적절히 처리" 류 없음. ✅

**3. Type consistency:**
- `PointEvent`(id,userId,points,reason,periodLabel,createdAt) — 도메인/테스트/페이지 일관. ✅
- `buildContributionGraph(events, {todayLabel, weeks})` → `ContributionGraph`(weeks, monthLabels, totalPoints, activeDays, currentStreak, longestStreak) — Task 7 정의, Task 9/12에서 동일 사용. ✅
- `deriveAchievements({level,longestStreak,totalCheckIns})` → `Achievement{key,earned,locked}` — Task 8 정의, Task 10/12 동일. ✅
- `validateProfileEdit` 결과 `value.{displayName,handle,bio}` — Task 4 정의, Task 5 액션에서 동일 사용. ✅
- `AccountProfile.handle/bio` — Task 3 추가, Task 6/11/12에서 사용. ✅
- i18n 키(`me.profile/edit/graph/achievements`) — Task 2에서 ko/en 동시 추가, 컴포넌트들이 동일 키 참조. ✅
- `EditProfileState.error` 합집합(검증 에러 + `handle-taken`/`unknown`) — Task 5 정의, Task 6 폼 `errorText` 매핑이 모든 키를 커버. ✅

**주의(실행 시 확인):** Task 7 Step 7의 `point-reason` import는 `points.ts` 상단에 이미 다른 import가 있으므로 중복 import가 되지 않게 한 곳에 합친다. Task 13의 헤더 아이콘 변경 후 기존 `points-history`/`goal-list` 테스트가 텍스트 매칭에 의존하면 깨지지 않는지 `npm run test`로 확인(아이콘은 `aria-hidden`, 텍스트 불변이라 안전).

---

## Execution Handoff

계획이 `docs/superpowers/plans/2026-06-26-personal-profile-instagram-redesign.md`에 저장되었습니다. 실행 방식 두 가지:

**1. Subagent-Driven (추천)** — Task마다 새 서브에이전트를 디스패치하고, Task 사이에 2단계 리뷰. 빠른 반복.

**2. Inline Execution** — 이 세션에서 executing-plans로 체크포인트와 함께 배치 실행.

**어느 방식으로 진행할까요?**
