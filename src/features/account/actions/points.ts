"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "../supabase/server";

export type ClaimState = {
  status: "idle" | "claimed" | "already" | "error";
};

const DEMO_PERIOD_LABEL = "2026-W25";

export async function claimPeriodRewardAction(
  _prevState: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const locale = normalizeLocale(formData.get("locale"));
  const supabase = await createServerSupabaseClient();

  // Authoritative: the reward amount is looked up server-side from
  // group_period_rewards inside the SECURITY DEFINER claim_period_reward
  // function. The client cannot supply or forge the points.
  const { data, error } = await supabase.rpc("claim_period_reward", {
    p_period_label: DEMO_PERIOD_LABEL,
  });

  if (error) return { status: "error" };

  if (data === "claimed") {
    revalidatePath(`/${locale}`);
    return { status: "claimed" };
  }
  if (data === "already") return { status: "already" };

  // "no-reward" / "no-profile" -> nothing to grant this period.
  return { status: "error" };
}
