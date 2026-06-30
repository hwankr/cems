"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Brain } from "lucide-react";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import {
  submitQuizAnswerAction,
  type SubmitQuizState,
} from "../actions/submit-quiz";
import type { QuizQuestionContent, QuizView } from "../domain/quiz";
import surface from "@/features/account/components/profile-surface.module.css";

const initialState: SubmitQuizState = { status: "idle" };

export function DailyQuiz({ quiz }: { quiz: QuizView }) {
  const { locale, messages } = useI18n();
  const copy = messages.me.quiz;
  const questions = messages.me.quizQuestions as Record<
    string,
    QuizQuestionContent
  >;
  const [state, formAction, pending] = useActionState(
    submitQuizAnswerAction,
    initialState,
  );

  const content = quiz.questionId ? questions[quiz.questionId] : undefined;

  function header() {
    return (
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Brain className="h-4 w-4 text-accent" aria-hidden="true" />
        {copy.title}
      </h2>
    );
  }

  if (!quiz.questionId || !content) {
    return (
      <section className={surface.section}>
        {header()}
        <p className="mt-3 text-sm text-ink-muted">{copy.empty}</p>
      </section>
    );
  }

  if (quiz.attempted) {
    return (
      <section className={surface.section}>
        {header()}
        <p className="mt-3 text-sm font-medium text-ink">{content.prompt}</p>
        <ul className="mt-3 grid gap-2">
          {content.options.map((option, index) => {
            const isAnswer = index === quiz.correctIndex;
            const isMine = index === quiz.selectedIndex;
            return (
              <li
                key={index}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                  isAnswer
                    ? "border-saving bg-saving/10 text-ink"
                    : isMine
                      ? "border-overuse bg-overuse/10 text-ink"
                      : "border-line text-ink-muted"
                }`}
              >
                <span>{option}</span>
                {isAnswer ? (
                  <span className="text-xs font-semibold text-saving">
                    {copy.answerTag}
                  </span>
                ) : isMine ? (
                  <span className="text-xs font-semibold text-overuse">
                    {copy.yourAnswerTag}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm font-semibold text-ink">
          {quiz.isCorrect ? copy.correct : copy.incorrect}
          <span className="ml-2 text-[var(--honey-strong)]">
            {interpolate(copy.awarded, {
              points: formatPoints(locale, quiz.awarded ?? 0),
            })}
          </span>
        </p>
        <p className="mt-1 text-xs font-semibold text-accent">
          {interpolate(copy.streak, { days: quiz.streak })}
        </p>
        <div className="mt-3 rounded-xl bg-inset px-3 py-2.5">
          <p className="text-xs font-semibold text-ink-muted">
            {copy.explanationTitle}
          </p>
          <p className="mt-1 text-sm text-ink">{content.explanation}</p>
          {content.actionHref && content.actionLabel ? (
            <Link
              href={`/${locale}${content.actionHref}`}
              className="mt-2 inline-block text-xs font-semibold text-accent"
            >
              {content.actionLabel} →
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={surface.section}>
      {header()}
      <p className="mt-3 text-sm font-medium text-ink">{content.prompt}</p>
      {state.status === "error" || state.status === "invalid" ? (
        <p className="mt-2 text-xs text-overuse">{copy.error}</p>
      ) : null}
      <form action={formAction} className="mt-3 grid gap-2">
        <input type="hidden" name="questionId" value={quiz.questionId} />
        <input type="hidden" name="locale" value={locale} />
        {content.options.map((option, index) => (
          <button
            key={index}
            type="submit"
            name="selectedIndex"
            value={index}
            disabled={pending}
            aria-busy={pending}
            className="rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-ink transition hover:bg-surface-3 disabled:opacity-60"
          >
            <PendingButtonContent
              pending={pending}
              idleLabel={option}
              pendingLabel={copy.submitting}
              spinnerClassName="h-3 w-3"
            />
          </button>
        ))}
      </form>
    </section>
  );
}
