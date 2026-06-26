"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import {
  demoSubjects,
  getDemoEnergyComparisons,
} from "@/features/campus-energy/data/demo-campus";
import { compareEnergy } from "@/features/campus-energy/domain/energy";
import { createServerSupabaseClient } from "../supabase/server";
import { getCurrentProfile } from "../data/account-dal";
import { calculateMemberPeriodReward } from "../domain/points";

export type ClaimState = {
  status: "idle" | "claimed" | "already" | "error";
};

const DEMO_PERIOD_LABEL = "2026-W25";
const REWARD_REASON = "verified-savings";

export async function claimPeriodRewardAction(
  _prevState: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const locale = normalizeLocale(formData.get("locale"));
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error" };

  // Aggregate the member's group savings for the demo period.
  const subjectIds = new Set(
    demoSubjects
      .filter((subject) => subject.groupId === profile.groupId)
      .map((subject) => subject.id),
  );
  const comparisons = getDemoEnergyComparisons().filter((comparison) =>
    subjectIds.has(comparison.subjectId),
  );
  const actualKwh = comparisons.reduce((sum, c) => sum + c.actualKwh, 0);
  const forecastKwh = comparisons.reduce((sum, c) => sum + c.forecastKwh, 0);
  const groupComparison =
    comparisons.length > 0
      ? compareEnergy({
          subjectId: profile.groupId,
          actualKwh,
          forecastKwh,
          periodLabel: DEMO_PERIOD_LABEL,
        })
      : null;

  const points = calculateMemberPeriodReward(groupComparison);
  if (points <= 0) return { status: "error" };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("point_events").insert({
    user_id: profile.userId,
    points,
    reason: REWARD_REASON,
    period_label: DEMO_PERIOD_LABEL,
  });

  if (error) {
    // 23505 = unique_violation → already claimed this period.
    if (error.code === "23505") {
      return { status: "already" };
    }
    return { status: "error" };
  }

  revalidatePath(`/${locale}`);
  return { status: "claimed" };
}
