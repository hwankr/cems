"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "../supabase/server";
import { getCurrentUser } from "../data/account-dal";
import {
  validateProfileEdit,
  type ProfileEditError,
} from "../domain/profile-edit";

export type EditProfileState = {
  error: ProfileEditError | "handle-taken" | "unknown" | null;
};

export async function editProfileAction(
  _prevState: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const locale = normalizeLocale(formData.get("locale"));
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me/edit`);

  const validation = validateProfileEdit({
    displayName: String(formData.get("displayName") ?? ""),
    handle: String(formData.get("handle") ?? ""),
    bio: String(formData.get("bio") ?? ""),
  });
  if (!validation.ok) return { error: validation.error };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: validation.value.displayName,
      handle: validation.value.handle,
      bio: validation.value.bio,
    })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation → the handle index collided.
    if (error.code === "23505") return { error: "handle-taken" };
    return { error: "unknown" };
  }

  revalidatePath(`/${locale}/me`);
  redirect(`/${locale}/me`);
}
