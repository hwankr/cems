// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthShell } from "../components/auth-shell";

// next/image needs the Next build pipeline; a plain <img> stand-in keeps the
// shell render hermetic in jsdom.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stand-in, not real UI
  default: ({ alt = "" }: { alt?: string }) => <img alt={alt} />,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("AuthShell", () => {
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

  it("renders the brand tag, a single h1 title, the subtitle, and the form slot", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <AuthShell
          brandName="CEMS"
          title="로그인"
          subtitle="다시 오신 걸 환영해요"
        >
          <form data-testid="slot">
            <button type="submit">제출</button>
          </form>
        </AuthShell>,
      );
    });

    expect(container.textContent).toContain("CEMS");
    expect(container.textContent).toContain("다시 오신 걸 환영해요");

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("로그인");

    expect(container.querySelector('[data-testid="slot"]')).not.toBeNull();
  });

  it("omits the subtitle when none is given", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <AuthShell brandName="CEMS" title="소속 등록">
          <div>form</div>
        </AuthShell>,
      );
    });

    expect(container.querySelector("h1")?.textContent).toBe("소속 등록");
    expect(container.textContent).not.toContain("다시 오신 걸 환영해요");
  });
});
