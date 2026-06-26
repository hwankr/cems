"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";

export type CompleteMissionState = {
  status: "idle" | "completed" | "already" | "invalid" | "error";
};

export async function completeMissionAction(
  _prevState: CompleteMissionState,
  formData: FormData,
): Promise<CompleteMissionState> {
  const code = String(formData.get("code") ?? "");
  const locale = normalizeLocale(formData.get("locale"));
  const supabase = await createServerSupabaseClient();

  // Authoritative: complete_mission validates the mission and awards the
  // mission's own point value server-side. The client cannot set points.
  const { data, error } = await supabase.rpc("complete_mission", {
    p_code: code,
  });
  if (error) return { status: "error" };

  if (data === "completed") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "completed" };
  }
  if (data === "already") return { status: "already" };
  if (data === "invalid") return { status: "invalid" };
  return { status: "error" };
}
