"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { saveProfileAction, type ProfileActionState } from "../actions/profile";
import type { GroupOption, SchoolOption } from "../domain/types";

const initialState: ProfileActionState = { error: null };

export function OnboardingForm({
  schools,
  groups,
}: {
  schools: SchoolOption[];
  groups: GroupOption[];
}) {
  const { locale, messages } = useI18n();
  const copy = messages.account.onboarding;
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(
    saveProfileAction,
    initialState,
  );
  const visibleGroups = groups.filter((group) => group.schoolId === schoolId);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="grid gap-1 text-sm">
        <span>{copy.displayName}</span>
        <input
          name="displayName"
          type="text"
          required
          maxLength={40}
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{copy.school}</span>
        <select
          name="schoolId"
          value={schoolId}
          onChange={(event) => setSchoolId(event.target.value)}
          className="h-11 rounded-xl border border-line bg-surface px-3"
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{copy.group}</span>
        <select
          name="groupId"
          required
          defaultValue=""
          className="h-11 rounded-xl border border-line bg-surface px-3"
        >
          <option value="" disabled>
            —
          </option>
          {visibleGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      {state.error ? (
        <p className="text-sm text-overuse">{copy.errors[state.error]}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? copy.pending : copy.submit}
      </button>
    </form>
  );
}
