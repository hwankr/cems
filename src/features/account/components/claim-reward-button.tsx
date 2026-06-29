"use client";

import { useActionState } from "react";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { claimPeriodRewardAction, type ClaimState } from "../actions/points";

const initialState: ClaimState = { status: "idle" };

export function ClaimRewardButton() {
  const { locale, messages } = useI18n();
  const copy = messages.account.reward;
  const [state, formAction, pending] = useActionState(
    claimPeriodRewardAction,
    initialState,
  );

  const label =
    state.status === "claimed"
      ? copy.claimed
      : state.status === "already"
        ? copy.alreadyClaimed
        : pending
          ? copy.pending
          : copy.claim;

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={
          pending || state.status === "claimed" || state.status === "already"
        }
        aria-busy={pending}
        className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        <PendingButtonContent
          pending={pending}
          idleLabel={label}
          pendingLabel={copy.pending}
        />
      </button>
    </form>
  );
}
