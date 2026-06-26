export type GoalScope = "daily" | "weekly";

export type Goal = {
  id: string;
  scope: GoalScope;
  targetCount: number;
  bonusPoints: number;
};

export type GoalCounts = {
  todayCount: number;
  weekCount: number;
};

export type GoalProgress = {
  id: string;
  scope: GoalScope;
  targetCount: number;
  bonusPoints: number;
  current: number;
  met: boolean;
  claimed: boolean;
  claimable: boolean;
};

export function computeGoalProgress(
  goals: readonly Goal[],
  counts: GoalCounts,
  claimedGoalIds: ReadonlySet<string>,
): GoalProgress[] {
  return goals.map((goal) => {
    const current =
      goal.scope === "daily" ? counts.todayCount : counts.weekCount;
    const met = current >= goal.targetCount;
    const claimed = claimedGoalIds.has(goal.id);
    return {
      id: goal.id,
      scope: goal.scope,
      targetCount: goal.targetCount,
      bonusPoints: goal.bonusPoints,
      current,
      met,
      claimed,
      claimable: met && !claimed,
    };
  });
}
