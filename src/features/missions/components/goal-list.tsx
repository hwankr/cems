"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { claimGoalRewardAction, type ClaimGoalState } from "../actions/claim-goal";
import type { GoalProgress } from "../domain/goals";

const initialState: ClaimGoalState = { status: "idle" };

function GoalCard({ goal }: { goal: GoalProgress }) {
  const { locale, messages } = useI18n();
  const copy = messages.me.goals;
  const titles = messages.me.goalTitles as Record<string, string>;
  const [state, formAction, pending] = useActionState(
    claimGoalRewardAction,
    initialState,
  );

  const claimed =
    goal.claimed || state.status === "claimed" || state.status === "already";
  const percent = Math.min(
    100,
    Math.round((goal.current / goal.targetCount) * 100),
  );

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">
          {titles[goal.id] ?? goal.id}
        </span>
        <span className="text-xs font-semibold text-accent">
          +{formatPoints(locale, goal.bonusPoints)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-inset">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-ink-muted">
          {goal.current}/{goal.targetCount}
        </span>
      </div>
      <div className="mt-3">
        {claimed ? (
          <span className="text-xs font-semibold text-saving">
            {copy.claimed}
          </span>
        ) : goal.claimable ? (
          <form action={formAction}>
            <input type="hidden" name="goalId" value={goal.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? copy.claiming : copy.claim}
            </button>
          </form>
        ) : (
          <span className="text-xs text-ink-subtle">{copy.inProgress}</span>
        )}
      </div>
    </li>
  );
}

export function GoalList({ goals }: { goals: GoalProgress[] }) {
  const { messages } = useI18n();
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{messages.me.goals.title}</h2>
      <ul className="mt-3 grid gap-3">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </ul>
    </section>
  );
}
