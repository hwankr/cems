"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { signUpAction, type AuthActionState } from "../actions/auth";
import styles from "./auth-shell.module.css";

const initialState: AuthActionState = { error: null };

export function SignupForm() {
  const { locale, messages } = useI18n();
  const copy = messages.account.signup;
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <label className={styles.fieldGroup}>
        <span className={styles.label}>{copy.email}</span>
        <span className={styles.fieldWrap}>
          <Mail className={styles.fieldIcon} aria-hidden="true" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={`${styles.field} ${styles.fieldWithIcon}`}
          />
        </span>
      </label>
      <label className={styles.fieldGroup}>
        <span className={styles.label}>{copy.password}</span>
        <span className={styles.fieldWrap}>
          <Lock className={styles.fieldIcon} aria-hidden="true" />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={`${styles.field} ${styles.fieldWithIcon}`}
          />
        </span>
      </label>
      {state.error ? <p className={styles.errorText}>{copy.failed}</p> : null}
      <button type="submit" disabled={pending} className={styles.primaryButton}>
        {pending ? copy.pending : copy.submit}
      </button>
      <p className={styles.altText}>
        {copy.hasAccount}{" "}
        <Link href={`/${locale}/login`} className={styles.altLink}>
          {copy.loginLink}
        </Link>
      </p>
    </form>
  );
}
