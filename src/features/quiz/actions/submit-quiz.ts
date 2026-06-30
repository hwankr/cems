"use server";

import { revalidatePath } from "next/cache";
import { normalizeLocale } from "@/i18n/config";
import { createServerSupabaseClient } from "@/features/account/supabase/server";

export type SubmitQuizState = {
  status: "idle" | "completed" | "already" | "invalid" | "error";
};

export async function submitQuizAnswerAction(
  _prevState: SubmitQuizState,
  formData: FormData,
): Promise<SubmitQuizState> {
  const questionId = String(formData.get("questionId") ?? "");
  const selectedIndex = Number(formData.get("selectedIndex"));
  const locale = normalizeLocale(formData.get("locale"));

  if (!Number.isInteger(selectedIndex)) return { status: "invalid" };

  const supabase = await createServerSupabaseClient();

  // Authoritative: submit_quiz_answer validates that p_question_id is today's
  // question, grades server-side, and awards participation + correct bonus +
  // streak bonus. The client cannot set the points or read the answer early.
  const { data, error } = await supabase.rpc("submit_quiz_answer", {
    p_question_id: questionId,
    p_selected_index: selectedIndex,
  });
  if (error) return { status: "error" };

  const result = ((data ?? []) as { result: string }[])[0]?.result;

  if (result === "completed") {
    revalidatePath(`/${locale}/me`);
    revalidatePath(`/${locale}`);
    return { status: "completed" };
  }
  if (result === "already") return { status: "already" };
  if (result === "invalid") return { status: "invalid" };
  return { status: "error" };
}
