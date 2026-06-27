// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildingContributorRanking } from "../components/building-contributor-ranking";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      mapView: {
        contributors: {
          title: "개인 기여 랭킹",
          subtitle: "누적 포인트 · 미리보기",
          pointsUnit: "P",
          you: "나",
          empty: "아직 등록된 기여자가 없어요",
          emptyHint: "이 건물을 운영하는 그룹의 기여자가 표시됩니다",
        },
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const contributors: SubjectContributor[] = [
  { userId: "u1", displayName: "게스트 1", points: 1850, rank: 1, isMe: false },
  { userId: "me", displayName: "나야나", points: 1320, rank: 2, isMe: true },
];

describe("BuildingContributorRanking", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders ranked contributors with points and a self highlight", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<BuildingContributorRanking contributors={contributors} />),
    );

    const text = container.textContent ?? "";
    expect(text).toContain("게스트 1");
    expect(text).toContain("나야나");
    expect(text).toContain("1,850");
    expect(text).toContain("나"); // self chip label
    // two ranked rows
    expect(container.querySelectorAll("li")).toHaveLength(2);

    await act(async () => root.unmount());
  });

  it("renders an empty state when there are no contributors", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<BuildingContributorRanking contributors={[]} />),
    );

    expect(container.textContent).toContain("아직 등록된 기여자가 없어요");
    expect(container.querySelectorAll("li")).toHaveLength(0);

    await act(async () => root.unmount());
  });
});
