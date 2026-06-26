"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";

export type ClaimGoalState = {
  status: "idle" | "claimed" | "already" | "not-met" | "error";
};

export async function claimGoalRewardAction(
  _prevState: ClaimGoalState,
  formData: FormData,
): Promise<ClaimGoalState> {
  const goalId = String(formData.get("goalId") ?? "");
  const locale = normalizeLocale(formData.get("locale"));
  const supabase = await createServerSupabaseClient();

  // Authoritative: claim_goal_reward recomputes eligibility from
  // mission_completions and awards the goal's bonus. Forgery is rejected.
  const { data, error } = await supabase.rpc("claim_goal_reward", {
    p_goal_id: goalId,
  });
  if (error) return { status: "error" };

  if (data === "claimed") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "claimed" };
  }
  if (data === "already") return { status: "already" };
  if (data === "not-met") return { status: "not-met" };
  return { status: "error" };
}
