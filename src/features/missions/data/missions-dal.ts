import "server-only";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import {
  computeGoalProgress,
  type Goal,
  type GoalProgress,
  type GoalScope,
} from "../domain/goals";

export type Mission = {
  kind: "mission";
  code: string;
  points: number;
  category: string;
};

type MissionRow = { code: string; points: number; category: string };

export type Checkpoint = {
  kind: "checkpoint";
  code: string;
  routeId: string;
  routeTitle: string;
  stepTitle: string;
  location: string;
  stepOrder: number;
  totalSteps: number;
  rewardPoints: number;
};

type CheckpointStepRow = {
  code: string;
  route_id: string;
  step_order: number;
  title: string;
  location_label: string;
  checkpoint_routes: {
    title: string;
    reward_points: number;
    active: boolean;
  };
};

export async function getMission(code: string): Promise<Mission | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("missions")
    .select("code, points, category")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load mission: ${error.message}`);
  const row = (data as MissionRow | null) ?? null;
  return row ? { kind: "mission", ...row } : null;
}

export async function getCheckpoint(code: string): Promise<Checkpoint | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("checkpoint_steps")
    .select(
      "code, route_id, step_order, title, location_label, checkpoint_routes!inner(title, reward_points, active)",
    )
    .eq("code", code)
    .eq("active", true)
    .eq("checkpoint_routes.active", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load checkpoint: ${error.message}`);
  const row = (data as unknown as CheckpointStepRow | null) ?? null;
  if (!row) return null;

  const { count, error: countError } = await supabase
    .from("checkpoint_steps")
    .select("code", { count: "exact", head: true })
    .eq("route_id", row.route_id)
    .eq("active", true);
  if (countError) {
    throw new Error(`Failed to load checkpoint count: ${countError.message}`);
  }

  return {
    kind: "checkpoint",
    code: row.code,
    routeId: row.route_id,
    routeTitle: row.checkpoint_routes.title,
    stepTitle: row.title,
    location: row.location_label,
    stepOrder: row.step_order,
    totalSteps: count ?? row.step_order,
    rewardPoints: row.checkpoint_routes.reward_points,
  };
}

export async function getScanTarget(
  code: string,
): Promise<Mission | Checkpoint | null> {
  const mission = await getMission(code);
  if (mission) return mission;
  return getCheckpoint(code);
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
