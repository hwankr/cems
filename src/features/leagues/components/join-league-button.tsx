"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { joinLeagueAction, type LeagueActionState } from "../actions/join-league";

const initialState: LeagueActionState = { status: "idle" };

export function JoinLeagueButton({ leagueId }: { leagueId: string }) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues.join;
  const [state, formAction, pending] = useActionState(joinLeagueAction, initialState);

  const joined = state.status === "joined" || state.status === "already";
  const label = joined ? copy.joined : pending ? copy.joining : copy.join;

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="leagueId" value={leagueId} />
      <button
        type="submit"
        disabled={pending || joined}
        className="h-9 rounded-full bg-accent px-4 text-xs font-semibold text-on-accent disabled:opacity-60"
      >
        {label}
      </button>
      <span
        role="status"
        aria-live="polite"
        className={state.status === "error" ? "ml-2 text-[11px] text-overuse" : undefined}
      >
        {state.status === "error" ? copy.error : ""}
      </span>
    </form>
  );
}
