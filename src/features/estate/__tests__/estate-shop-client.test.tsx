// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { enMessages } from "@/i18n/messages/en";
import { getEstatePageData } from "../data/get-estate-page-data";
import { EstateShopClient } from "../components/estate-shop-client";
import { MemoryEstateRepository } from "../persistence/memory-estate-repository";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("EstateShopClient", () => {
  let root: Root | null;
  let container: HTMLDivElement;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    document.body.replaceChildren();
  });

  async function renderShop(repository: MemoryEstateRepository) {
    const data = await getEstatePageData("en", "yu-e21", {
      getProfileGroupId: async () => "engineering",
      getGroupEarnedPoints: async () => 100000,
    });
    if (!data) throw new Error("Expected estate page data.");

    root = createRoot(container);
    await act(async () => {
      root?.render(
        <I18nProvider locale="en" messages={enMessages}>
          <EstateShopClient data={data} repository={repository} />
        </I18nProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("renders the catalog and links back to the estate to place items", async () => {
    await renderShop(new MemoryEstateRepository());

    expect(container.textContent).toContain("Shop");

    const estateHref = "/en/subjects/yu-e21/estate";
    const linkHrefs = [...container.querySelectorAll("a")].map((anchor) =>
      anchor.getAttribute("href"),
    );

    // A back affordance and the "return to place" CTA both target the estate.
    expect(linkHrefs.filter((href) => href === estateHref).length).toBeGreaterThanOrEqual(2);

    // Purchase actions exist (catalog rendered).
    const buyButtons = [...container.querySelectorAll("button")].filter(
      (button) => button.textContent?.includes("Buy"),
    );
    expect(buyButtons.length).toBeGreaterThan(0);
  });

  it("buys an affordable item and persists it to the repository", async () => {
    const repository = new MemoryEstateRepository();
    await renderShop(repository);

    const affordableBuy = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Buy") && !button.disabled,
    );
    expect(affordableBuy).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      affordableBuy?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const loaded = await repository.load("yu-e21");
    expect(loaded.ok).toBe(true);
    expect(loaded.snapshot?.inventory.length ?? 0).toBeGreaterThan(0);
  });
});
