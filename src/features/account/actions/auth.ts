"use server";

import { redirect } from "next/navigation";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "../supabase/server";

export type AuthActionState = { error: string | null };

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
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(`/${locale}`);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/ko/login");
}
