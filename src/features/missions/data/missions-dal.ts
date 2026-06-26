import "server-only";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import {
  computeGoalProgress,
  type Goal,
  type GoalProgress,
  type GoalScope,
} from "../domain/goals";

export type Mission = {
  code: string;
  points: number;
  category: string;
};

type MissionRow = { code: string; points: number; category: string };

export async function getActiveMissions(): Promise<Mission[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("missions")
    .select("code, points, category")
    .eq("active", true)
    .order("code");
  if (error) throw new Error(`Failed to load missions: ${error.message}`);
  return (data ?? []) as MissionRow[];
}

export async function getMission(code: string): Promise<Mission | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("missions")
    .select("code, points, category")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load mission: ${error.message}`);
  return (data as MissionRow | null) ?? null;
}

type GoalRow = {
  id: string;
  scope: string;
  target_count: number;
  bonus_points: number;
};

type GoalProgressRow = {
  today_label: string;
  week_label: string;
  today_count: number;
  week_count: number;
};

export async function getGoalsWithProgress(
  userId: string,
): Promise<GoalProgress[]> {
  const supabase = await createServerSupabaseClient();

  const { data: goalRows, error: goalsError } = await supabase
    .from("goals")
    .select("id, scope, target_count, bonus_points")
    .eq("active", true)
    .order("id");
  if (goalsError) throw new Error(`Failed to load goals: ${goalsError.message}`);

  const goals: Goal[] = ((goalRows ?? []) as GoalRow[]).map((row) => ({
    id: row.id,
    scope: row.scope as GoalScope,
    targetCount: row.target_count,
    bonusPoints: row.bonus_points,
  }));

  const { data: progressRows, error: progressError } =
    await supabase.rpc("get_my_goal_progress");
  if (progressError) {
    throw new Error(`Failed to load goal progress: ${progressError.message}`);
  }
  const progress = ((progressRows ?? []) as GoalProgressRow[])[0];
  const todayLabel = progress?.today_label ?? "";
  const weekLabel = progress?.week_label ?? "";
  const counts = {
    todayCount: progress?.today_count ?? 0,
    weekCount: progress?.week_count ?? 0,
  };

  const goalReasons = goals.map((goal) => `goal:${goal.id}`);
  const { data: claimRows, error: claimError } = await supabase
    .from("point_events")
    .select("reason, period_label")
    .eq("user_id", userId)
    .in("reason", goalReasons.length ? goalReasons : ["__none__"])
    .in("period_label", [todayLabel, weekLabel]);
  if (claimError) {
    throw new Error(`Failed to load goal claims: ${claimError.message}`);
  }

  const claims = (claimRows ?? []) as { reason: string; period_label: string }[];
  const claimedGoalIds = new Set<string>();
  for (const goal of goals) {
    const period = goal.scope === "daily" ? todayLabel : weekLabel;
    if (
      claims.some(
        (c) => c.reason === `goal:${goal.id}` && c.period_label === period,
      )
    ) {
      claimedGoalIds.add(goal.id);
    }
  }

  return computeGoalProgress(goals, counts, claimedGoalIds);
}
