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

export type CancelMissionState = {
  status: "idle" | "cancelled" | "nothing" | "error";
};

// Demo/testing helper: undo today's check-in for this mission so it can be
// scanned again. Authoritative via cancel_mission (deletes only the caller's
// own rows for today; removes the points it added, so the daily cap holds).
export async function cancelMissionAction(
  _prevState: CancelMissionState,
  formData: FormData,
): Promise<CancelMissionState> {
  const code = String(formData.get("code") ?? "");
  const locale = normalizeLocale(formData.get("locale"));
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("cancel_mission", {
    p_code: code,
  });
  if (error) return { status: "error" };

  if (data === "cancelled") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "cancelled" };
  }
  if (data === "nothing") return { status: "nothing" };
  return { status: "error" };
}

export type CompleteCheckpointState = {
  status:
    | "idle"
    | "step"
    | "completed"
    | "already"
    | "already-step"
    | "out-of-order"
    | "invalid"
    | "error";
};

export async function completeCheckpointAction(
  _prevState: CompleteCheckpointState,
  formData: FormData,
): Promise<CompleteCheckpointState> {
  const code = String(formData.get("code") ?? "");
  const locale = normalizeLocale(formData.get("locale"));
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("complete_checkpoint_step", {
    p_code: code,
  });
  if (error) return { status: "error" };

  if (data === "step") return { status: "step" };
  if (data === "completed") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "completed" };
  }
  if (data === "already") return { status: "already" };
  if (data === "already-step") return { status: "already-step" };
  if (data === "out-of-order") return { status: "out-of-order" };
  if (data === "invalid") return { status: "invalid" };
  return { status: "error" };
}
