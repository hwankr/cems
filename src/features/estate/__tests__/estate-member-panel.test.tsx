// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { koMessages } from "@/i18n/messages/ko";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";
import { EstateMemberPanel } from "../components/estate-member-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateMemberPanel", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    document.body.replaceChildren();
  });

  async function render(contributors: SubjectContributor[]) {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="ko" messages={koMessages}>
          <EstateMemberPanel
            contributors={contributors}
            copy={koMessages.estate}
            locale="ko"
            onClose={() => {}}
          />
        </I18nProvider>,
      );
    });
  }

  it("renders contributors in order and highlights me", async () => {
    await render([
      { userId: "a", displayName: "대표 데모", points: 1200, rank: 1, isMe: true },
      { userId: "b", displayName: "svc01", points: 800, rank: 2, isMe: false },
    ]);

    expect(container.textContent).toContain("절감 참여 인원");
    expect(container.textContent).toContain("대표 데모");
    expect(container.textContent).toContain("나");
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(2);
  });

  it("renders an empty state when there are no contributors", async () => {
    await render([]);
    expect(container.textContent).toContain("아직 참여 인원이 없습니다");
  });
});
