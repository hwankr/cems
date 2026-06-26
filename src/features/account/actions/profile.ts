"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../supabase/server";
import { getCurrentUser, getGroupOptions } from "../data/account-dal";
import { validateProfileDraft } from "../domain/profile";
import type { ProfileValidationError } from "../domain/types";

export type ProfileActionState = {
  error: ProfileValidationError | "unknown" | null;
};

export async function saveProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const locale = String(formData.get("locale") ?? "ko");
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const groups = await getGroupOptions();
  const validation = validateProfileDraft(
    {
      displayName: String(formData.get("displayName") ?? ""),
      schoolId: String(formData.get("schoolId") ?? ""),
      groupId: String(formData.get("groupId") ?? ""),
    },
    groups,
  );

  if (!validation.ok) {
    return { error: validation.error };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: validation.value.displayName,
    school_id: validation.value.schoolId,
    group_id: validation.value.groupId,
  });

  if (error) {
    return { error: "unknown" };
  }

  redirect(`/${locale}`);
}
