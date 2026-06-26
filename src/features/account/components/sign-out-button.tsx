"use client";

import { useI18n } from "@/i18n/client";
import { signOutAction } from "../actions/auth";

export function SignOutButton() {
  const { messages } = useI18n();
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm font-medium text-ink-muted">
        {messages.account.signOut}
      </button>
    </form>
  );
}
