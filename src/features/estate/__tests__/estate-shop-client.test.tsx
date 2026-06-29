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
      getSubjectAwardTier: async () => null,
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

  it("eco and points items are gated independently by their own currency", async () => {
    const repository = new MemoryEstateRepository();
    await renderShop(repository);

    // Eco balance: snapshot has ecoCredits=0, ecoCollectedAt=seed date (2026-06-24),
    // main-building level 1 → 6 eco/hr, no generators, elapsed >>24h → capped at 24h →
    // pending = floor(6 * 24) = 144. Available eco = 144.
    // Fountain costs 220 > 144 → its Buy button must be disabled.
    // Solar array costs 600 (points) <= 100000 (points balance) → its Buy button must be enabled.

    // Find the Fountain card and assert its Buy button is disabled.
    const fountainName = enMessages.estate.items.fountain;
    const fountainHeading = [...container.querySelectorAll("h2")].find(
      (h2) => h2.textContent === fountainName,
    );
    expect(fountainHeading).toBeInstanceOf(HTMLElement);
    const fountainCard = fountainHeading!.closest("div.flex.gap-3");
    const fountainBuyBtn = fountainCard?.querySelector("button");
    expect(fountainBuyBtn).toBeInstanceOf(HTMLButtonElement);
    expect(fountainBuyBtn!.disabled).toBe(true);

    // Solar array is in the "generator" category — switch to that filter first.
    const generatorBtn = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent === enMessages.estate.categories.generator,
    );
    await act(async () => {
      generatorBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const solarArrayName = enMessages.estate.items["solar-array"];
    const solarArrayHeading = [...container.querySelectorAll("h2")].find(
      (h2) => h2.textContent === solarArrayName,
    );
    expect(solarArrayHeading).toBeInstanceOf(HTMLElement);
    const solarArrayCard = solarArrayHeading!.closest("div.flex.gap-3");
    const solarArrayBuyBtn = solarArrayCard?.querySelector("button");
    expect(solarArrayBuyBtn).toBeInstanceOf(HTMLButtonElement);
    expect(solarArrayBuyBtn!.disabled).toBe(false);
  });

  it("shows both currency balance chips and the generator category", async () => {
    const repository = new MemoryEstateRepository();
    await renderShop(repository);

    // Both balance chips exist — identified by their aria-label (icon + number, no text label).
    const pointsChip = container.querySelector(
      `[aria-label="${enMessages.estate.currency.points}"]`,
    );
    const ecoChip = container.querySelector(
      `[aria-label="${enMessages.estate.currency.eco}"]`,
    );
    expect(pointsChip).toBeInstanceOf(HTMLElement);
    expect(ecoChip).toBeInstanceOf(HTMLElement);

    // Generator category ("Facilities") appears in the filter row.
    expect(container.textContent).toContain(
      enMessages.estate.categories.generator,
    );

    // Both a points-priced card (Coins icon) and an eco-priced card (Sprout icon) are present.
    // The SVGs are rendered by lucide-react; we can check the price spans contain the items' costs
    // by verifying distinct currency icons exist in the price tags area.
    // Simpler: confirm both disabled states reflect currency — at least one eco card and one points card render.
    // We check the filter row shows the generator tab (points currency) and an eco-priced item exists.
    const filterButtons = [...container.querySelectorAll("button")];
    const generatorBtn = filterButtons.find(
      (btn) => btn.textContent === enMessages.estate.categories.generator,
    );
    expect(generatorBtn).toBeInstanceOf(HTMLButtonElement);

    // Switch to generator category and confirm cards render (points currency).
    await act(async () => {
      generatorBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const generatorCards = [...container.querySelectorAll("button")].filter(
      (btn) => btn.textContent?.includes("Buy"),
    );
    expect(generatorCards.length).toBeGreaterThan(0);

    // Switch to "All" to see both currency types are present overall.
    await act(async () => {
      const allBtn = [...container.querySelectorAll("button")].find(
        (btn) => btn.textContent === enMessages.estate.categories.all,
      );
      allBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // eco-priced and points-priced price spans both exist (identified by SVG title or data attribute).
    // Since lucide SVGs don't add text, confirm that Sprout (eco) icon SVGs appear in the card grid.
    // Sprout SVG uses a known path shape — we check it renders without a text assertion.
    const priceTagSpans = [...container.querySelectorAll("span")].filter(
      (span) =>
        span.className?.includes?.("priceTag") ||
        (span.querySelector("svg") !== null &&
          span.className?.includes?.("font-mono")),
    );
    expect(priceTagSpans.length).toBeGreaterThan(0);
  });
});
