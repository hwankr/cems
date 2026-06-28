"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { signInAction, type AuthActionState } from "../actions/auth";
import styles from "./auth-shell.module.css";

const initialState: AuthActionState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const { locale, messages } = useI18n();
  const copy = messages.account.login;
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className={styles.fieldRow}>
        <span className={styles.srOnly}>{copy.email}</span>
        <span className={styles.fieldIcon}>
          <Mail aria-hidden="true" />
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={copy.email}
          className={styles.field}
        />
      </label>
      <label className={styles.fieldRow}>
        <span className={styles.srOnly}>{copy.password}</span>
        <span className={styles.fieldIcon}>
          <Lock aria-hidden="true" />
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder={copy.password}
          className={styles.field}
        />
      </label>
      {state.error ? <p className={styles.errorText}>{copy.failed}</p> : null}
      <button type="submit" disabled={pending} className={styles.primaryButton}>
        {pending ? copy.pending : copy.submit}
      </button>
      <p className={styles.altText}>
        {copy.noAccount}{" "}
        <Link href={`/${locale}/signup`} className={styles.altLink}>
          {copy.signupLink}
        </Link>
      </p>
    </form>
  );
}
