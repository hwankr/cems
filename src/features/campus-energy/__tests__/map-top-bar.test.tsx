// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapTopBar } from "../components/map-top-bar";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      mapView: {
        brandTitle: "Campus Energy",
        brandSubtitle: "Live power monitoring",
        searchPlaceholder: "Search buildings",
        campusSelectLabel: "Select campus",
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("MapTopBar", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("hides brand text and the campus select below sm, keeps the search input", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <MapTopBar query="" onQueryChange={() => {}} schoolName="Yeungnam" />,
      ),
    );

    // Brand title text lives in a wrapper that is hidden until sm.
    const title = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "Campus Energy",
    );
    expect(title?.closest(".hidden")).not.toBeNull();

    // Campus select wrapper is hidden until sm.
    const select = container.querySelector("select");
    expect(select?.closest(".hidden")).not.toBeNull();

    // Search input fills the row on mobile, fixed width on desktop.
    const input = container.querySelector("input");
    expect(input?.className).toContain("w-full");
    expect(input?.className).toContain("sm:w-32");

    await act(async () => root.unmount());
  });

  it("forwards typing to onQueryChange", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    const onQueryChange = vi.fn();

    await act(async () =>
      root.render(
        <MapTopBar query="" onQueryChange={onQueryChange} schoolName="Yeungnam" />,
      ),
    );

    const input = container.querySelector("input") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "lib");
    await act(async () =>
      input.dispatchEvent(new Event("input", { bubbles: true })),
    );

    expect(onQueryChange).toHaveBeenCalledWith("lib");

    await act(async () => root.unmount());
  });
});
