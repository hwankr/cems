"use server";

import { redirect } from "next/navigation";
import { normalizeLocale } from "@/i18n/config";
import { isSafeNextPath } from "../domain/safe-redirect";
import {
  isDemoGuestKey,
  type DemoGuestKey,
} from "../demo/demo-guest-personas";
import { createServerSupabaseClient } from "../supabase/server";

export type AuthActionState = { error: string | null };
export type DemoGuestActionState = {
  error:
    | null
    | "disabled"
    | "missing-password"
    | "invalid-guest"
    | "failed";
};

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Validate the client-supplied locale to avoid an open redirect
  // (e.g. locale="/evil.example" -> "//evil.example").
  const locale = normalizeLocale(formData.get("locale"));
  return { email, password, locale };
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password, locale } = readCredentials(formData);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(`/${locale}/onboarding`);
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password, locale } = readCredentials(formData);
  const next = isSafeNextPath(formData.get("next"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(next ?? `/${locale}`);
}

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
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword(credential);

  if (error) {
    return { error: "failed" };
  }

  redirect(next ?? `/${locale}`);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/ko/login");
}
