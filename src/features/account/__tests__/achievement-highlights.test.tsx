// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AchievementHighlights } from "../components/achievement-highlights";
import type { Achievement } from "../domain/achievements";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      me: {
        achievements: {
          title: "성취",
          campusSaver: "캠퍼스 세이버",
          energyHero: "에너지 히어로",
          gridGuardian: "그리드 가디언",
          streak7: "7일 연속",
          checkIn10: "인증 10회",
          topStudent: "최우수 학생",
          lockedHint: "곧 공개",
        },
      },
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function render(achievements: Achievement[]) {
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);
  return { container, root };
}

describe("AchievementHighlights top-student badge", () => {
  afterEach(() => document.body.replaceChildren());

  const base: Achievement[] = [
    { key: "campus-saver", earned: true, locked: false },
  ];

  it("paints an earned gold top-student badge in gold tone", async () => {
    const { container, root } = render([
      ...base,
      { key: "top-student", earned: true, locked: false, tier: "gold" },
    ]);
    await act(async () =>
      root.render(
        <AchievementHighlights
          achievements={[
            ...base,
            { key: "top-student", earned: true, locked: false, tier: "gold" },
          ]}
        />,
      ),
    );
    const badge = container.querySelector('[data-achievement="top-student"]');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("data-tier")).toBe("gold");
    await act(async () => root.unmount());
  });

  it("keeps a locked top-student slot when not earned", async () => {
    const { container, root } = render(base);
    await act(async () =>
      root.render(
        <AchievementHighlights
          achievements={[
            ...base,
            { key: "top-student", earned: false, locked: true },
          ]}
        />,
      ),
    );
    const badge = container.querySelector('[data-achievement="top-student"]');
    expect(badge?.getAttribute("data-locked")).toBe("true");
    await act(async () => root.unmount());
  });
});
