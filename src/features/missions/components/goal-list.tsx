"use client";

import { useActionState } from "react";
import { Target } from "lucide-react";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { claimGoalRewardAction, type ClaimGoalState } from "../actions/claim-goal";
import type { GoalProgress } from "../domain/goals";
import surface from "@/features/account/components/profile-surface.module.css";

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
    <li className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">
          {titles[goal.id] ?? goal.id}
        </span>
        <span className="text-xs font-bold text-[var(--honey-strong)]">
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
      <div className="mt-2.5">
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
              aria-busy={pending}
              className="h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent disabled:opacity-60"
            >
              <PendingButtonContent
                pending={pending}
                idleLabel={copy.claim}
                pendingLabel={copy.claiming}
                spinnerClassName="h-3 w-3"
              />
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
    <section className={surface.section}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Target className="h-4 w-4 text-accent" aria-hidden="true" />
        {messages.me.goals.title}
      </h2>
      <ul className="mt-1 divide-y divide-line">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </ul>
    </section>
  );
}
