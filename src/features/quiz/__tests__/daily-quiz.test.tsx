// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      me: {
        quiz: {
          title: "오늘의 환경 퀴즈",
          submit: "제출",
          submitting: "제출 중…",
          correct: "정답!",
          incorrect: "오답",
          answerTag: "정답",
          yourAnswerTag: "내 답",
          awarded: "+{points} 적립",
          streak: "🔥 {days}일 연속",
          explanationTitle: "해설",
          empty: "오늘 풀 수 있는 퀴즈가 없어요.",
          error: "잠시 후 다시 시도해주세요.",
        },
        quizQuestions: {
          "q-led": {
            prompt: "LED 전구 문제",
            options: ["약 20%", "약 80%", "차이 없음"],
            explanation: "LED 해설",
            actionLabel: "관련 미션 보기",
            actionHref: "/scan/lights-off",
          },
        },
      },
    },
  }),
}));

let mockActionState: [{ status: string }, () => void, boolean] = [
  { status: "idle" },
  () => {},
  false,
];

vi.mock("react", async (orig) => {
  const actual = await orig<typeof import("react")>();
  return { ...actual, useActionState: () => mockActionState };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

import { DailyQuiz } from "../components/daily-quiz";
import type { QuizView } from "../domain/quiz";

const base: QuizView = {
  questionId: "q-led",
  optionCount: 3,
  participationPoints: 10,
  bonusPoints: 30,
  attempted: false,
  selectedIndex: null,
  isCorrect: null,
  correctIndex: null,
  awarded: null,
  streak: 0,
};

function setup() {
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);
  return { container, root };
}

describe("DailyQuiz", () => {
  afterEach(() => {
    document.body.replaceChildren();
    mockActionState = [{ status: "idle" }, () => {}, false];
  });

  it("renders the prompt and option submit buttons when unattempted", async () => {
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={base} />));
    expect(container.textContent).toContain("LED 전구 문제");
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      'button[name="selectedIndex"]',
    );
    expect(buttons.length).toBe(3);
    expect(buttons[1]?.value).toBe("1");
    await act(async () => root.unmount());
  });

  it("does not reveal the answer or explanation when unattempted", async () => {
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={base} />));
    expect(container.textContent).not.toContain("LED 해설");
    expect(container.textContent).not.toContain("정답!");
    await act(async () => root.unmount());
  });

  it("shows correct result, award, streak, explanation, and deep link when attempted correctly", async () => {
    const attempted: QuizView = {
      ...base,
      attempted: true,
      selectedIndex: 1,
      isCorrect: true,
      correctIndex: 1,
      awarded: 40,
      streak: 3,
    };
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={attempted} />));
    expect(container.textContent).toContain("정답!");
    expect(container.textContent).toContain("LED 해설");
    expect(container.textContent).toContain("+40점 적립");
    expect(container.textContent).toContain("🔥 3일 연속");
    const link = container.querySelector<HTMLAnchorElement>('a[href="/ko/scan/lights-off"]');
    expect(link).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("marks an incorrect attempt", async () => {
    const attempted: QuizView = {
      ...base,
      attempted: true,
      selectedIndex: 0,
      isCorrect: false,
      correctIndex: 1,
      awarded: 10,
      streak: 1,
    };
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={attempted} />));
    expect(container.textContent).toContain("오답");
    expect(container.textContent).toContain("+10점 적립");
    await act(async () => root.unmount());
  });

  it("shows an empty state when there is no question today", async () => {
    const empty: QuizView = { ...base, questionId: null };
    const { container, root } = setup();
    await act(async () => root.render(<DailyQuiz quiz={empty} />));
    expect(container.textContent).toContain("오늘 풀 수 있는 퀴즈가 없어요.");
    await act(async () => root.unmount());
  });
});
