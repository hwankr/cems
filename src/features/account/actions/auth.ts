"use server";

import { redirect } from "next/navigation";
import { normalizeLocale } from "@/i18n/config";
import { isSafeNextPath } from "../domain/safe-redirect";
import {
  isDemoGuestKey,
  type DemoGuestKey,
} from "../demo/demo-guest-personas";
import { createServerSupabaseClient } from "../supabase/server";

export type DemoGuestActionState = {
  error: null | "invalid-guest" | "failed";
};

export async function signInDemoGuestAction(
  guestKey: DemoGuestKey,
  _prevState: DemoGuestActionState,
  formData: FormData,
): Promise<DemoGuestActionState> {
  const locale = normalizeLocale(formData.get("locale"));
  const next = isSafeNextPath(formData.get("next"));

  if (!isDemoGuestKey(guestKey)) {
    return { error: "invalid-guest" };
  }

  const { resolveDemoGuestCredential } = await import(
    "../demo/demo-guest-credentials"
  );
  const credential = resolveDemoGuestCredential(guestKey);
  if ("error" in credential) {
    return { error: credential.error };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(credential);

  if (error) {
    return { error: "failed" };
  }

  redirect(next ?? `/${locale}`);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/ko/login");
}
