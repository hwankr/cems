// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentWinners } from "../components/student-winners";
import type { StudentAward } from "../domain/types";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      hallOfFame: { studentSectionTitle: "우수 학생", rankUnit: "위" },
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const students: StudentAward[] = [
  { tier: "gold", rank: 1, userId: "it1", displayName: "대표 데모", metricValue: 1600 },
  { tier: "gold", rank: 2, userId: "g12", displayName: "게스트 12", metricValue: 1300 },
];

describe("StudentWinners", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders one row per winner with names and ranks", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<StudentWinners students={students} />));

    expect(container.querySelectorAll("li")).toHaveLength(2);
    const text = container.textContent ?? "";
    expect(text).toContain("대표 데모");
    expect(text).toContain("게스트 12");
    expect(text).toContain("우수 학생");

    await act(async () => root.unmount());
  });

  it("renders nothing when there are no winners", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<StudentWinners students={[]} />));
    expect(container.querySelectorAll("li")).toHaveLength(0);

    await act(async () => root.unmount());
  });
});
