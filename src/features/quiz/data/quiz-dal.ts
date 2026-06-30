import "server-only";
import { createServerSupabaseClient } from "@/features/account/supabase/server";
import type { QuizView } from "../domain/quiz";

type TodayQuizRow = {
  question_id: string | null;
  option_count: number | null;
  participation_points: number | null;
  bonus_points: number | null;
  attempted: boolean;
  selected_index: number | null;
  is_correct: boolean | null;
  correct_index: number | null;
  awarded: number | null;
  streak: number | null;
};

export async function getTodayQuiz(): Promise<QuizView> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_today_quiz");
  if (error) throw new Error(`Failed to load today's quiz: ${error.message}`);

  const row = ((data ?? []) as TodayQuizRow[])[0];
  if (!row) {
    return {
      questionId: null,
      optionCount: 0,
      participationPoints: 0,
      bonusPoints: 0,
      attempted: false,
      selectedIndex: null,
      isCorrect: null,
      correctIndex: null,
      awarded: null,
      streak: 0,
    };
  }

  return {
    questionId: row.question_id,
    optionCount: row.option_count ?? 0,
    participationPoints: row.participation_points ?? 0,
    bonusPoints: row.bonus_points ?? 0,
    attempted: row.attempted,
    selectedIndex: row.selected_index,
    isCorrect: row.is_correct,
    correctIndex: row.correct_index,
    awarded: row.awarded,
    streak: row.streak ?? 0,
  };
}
