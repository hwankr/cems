export type QuizView = {
  questionId: string | null;
  optionCount: number;
  participationPoints: number;
  bonusPoints: number;
  attempted: boolean;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  correctIndex: number | null;
  awarded: number | null;
  streak: number;
};

export type QuizQuestionContent = {
  prompt: string;
  options: readonly string[];
  explanation: string;
  actionLabel?: string;
  actionHref?: string;
};

// MUST match the SQL function public.quiz_streak_bonus (migration daily_quiz).
// Exact-milestone bonuses folded into the day's award; off-milestone = 0.
const DEFAULT_MILESTONES: Record<number, number> = {
  3: 20,
  7: 50,
  14: 100,
  30: 200,
};

export function quizStreakBonus(
  streak: number,
  milestones: Record<number, number> = DEFAULT_MILESTONES,
): number {
  return milestones[streak] ?? 0;
}
