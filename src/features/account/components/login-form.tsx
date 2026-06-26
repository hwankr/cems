"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { signInAction, type AuthActionState } from "../actions/auth";

const initialState: AuthActionState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const { locale, messages } = useI18n();
  const copy = messages.account.login;
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="grid gap-1 text-sm">
        <span>{copy.email}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{copy.password}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 rounded-xl border border-line bg-surface px-3"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-overuse">{copy.failed}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? copy.pending : copy.submit}
      </button>
      <p className="text-sm text-ink-muted">
        {copy.noAccount}{" "}
        <Link href={`/${locale}/signup`} className="font-semibold text-accent">
          {copy.signupLink}
        </Link>
      </p>
    </form>
  );
}
