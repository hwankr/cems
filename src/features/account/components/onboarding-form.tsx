"use client";

import { Building2, User, Users } from "lucide-react";
import { useActionState, useState } from "react";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { saveProfileAction, type ProfileActionState } from "../actions/profile";
import type { GroupOption, SchoolOption } from "../domain/types";
import styles from "./auth-shell.module.css";

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
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />
      <label className={styles.fieldRow}>
        <span className={styles.srOnly}>{copy.displayName}</span>
        <span className={styles.fieldIcon}>
          <User aria-hidden="true" />
        </span>
        <input
          name="displayName"
          type="text"
          required
          maxLength={40}
          placeholder={copy.displayName}
          className={styles.field}
        />
      </label>
      <label className={styles.fieldRow}>
        <span className={styles.srOnly}>{copy.school}</span>
        <span className={styles.fieldIcon}>
          <Building2 aria-hidden="true" />
        </span>
        <select
          name="schoolId"
          value={schoolId}
          onChange={(event) => setSchoolId(event.target.value)}
          className={styles.field}
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.fieldRow}>
        <span className={styles.srOnly}>{copy.group}</span>
        <span className={styles.fieldIcon}>
          <Users aria-hidden="true" />
        </span>
        <select
          name="groupId"
          required
          defaultValue=""
          className={styles.field}
        >
          <option value="" disabled>
            {copy.group}
          </option>
          {visibleGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      {state.error ? (
        <p className={styles.errorText}>{copy.errors[state.error]}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={styles.primaryButton}
      >
        <PendingButtonContent
          pending={pending}
          idleLabel={copy.submit}
          pendingLabel={copy.pending}
        />
      </button>
    </form>
  );
}
