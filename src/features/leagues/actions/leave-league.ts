"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import type { LeagueActionState } from "./join-league";

export async function leaveLeagueAction(
  _prevState: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const leagueId = formData.get("leagueId");
  if (typeof leagueId !== "string" || leagueId.length === 0) {
    return { status: "error" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("leave_league", {
    p_league_id: leagueId,
  });
  if (error) return { status: "error" };

  if (data === "left" || data === "absent") {
    revalidatePath(`/${locale}/leagues`);
    revalidatePath(`/${locale}/leagues/${leagueId}`);
    return { status: data };
  }
  return { status: "error" };
}
