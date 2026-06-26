// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapControls } from "../components/map-controls";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    messages: {
      mapView: {
        controls: {
          myOrg: "My organization",
          profile: "My page",
          heatmap: "Usage heatmap",
          labels: "Building labels",
          settings: "Map settings",
        },
      },
    },
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function baseProps() {
  return {
    profileHref: "/ko/me",
    showHeat: false,
    onToggleHeat: () => {},
    showLabels: true,
    onToggleLabels: () => {},
    onOpenSettings: () => {},
  };
}

describe("MapControls", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("calls onGoToMyOrg when the org shortcut is clicked", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    const onGoToMyOrg = vi.fn();
    document.body.append(container);

    await act(async () =>
      root.render(<MapControls {...baseProps()} onGoToMyOrg={onGoToMyOrg} />),
    );

    const orgButton = container.querySelector(
      'button[aria-label="My organization"]',
    ) as HTMLButtonElement | null;
    expect(orgButton).not.toBeNull();

    await act(async () => orgButton?.click());
    expect(onGoToMyOrg).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });

  it("renders the profile shortcut as a link to the given href", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <MapControls {...baseProps()} profileHref="/ko/me" onGoToMyOrg={() => {}} />,
      ),
    );

    const profileLink = container.querySelector(
      'a[aria-label="My page"]',
    ) as HTMLAnchorElement | null;
    expect(profileLink).not.toBeNull();
    expect(profileLink?.getAttribute("href")).toBe("/ko/me");

    await act(async () => root.unmount());
  });

  it("hides the org shortcut when onGoToMyOrg is not provided", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () => root.render(<MapControls {...baseProps()} />));

    expect(
      container.querySelector('button[aria-label="My organization"]'),
    ).toBeNull();
    // profile + settings still render
    expect(container.querySelector('a[aria-label="My page"]')).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Map settings"]'),
    ).not.toBeNull();

    await act(async () => root.unmount());
  });

  it("keeps the settings button visible but hides heat/label buttons below sm", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(<MapControls {...baseProps()} onGoToMyOrg={() => {}} />),
    );

    const heat = container.querySelector('button[aria-label="Usage heatmap"]');
    const labels = container.querySelector('button[aria-label="Building labels"]');
    const settings = container.querySelector('button[aria-label="Map settings"]');

    expect(heat?.closest(".hidden")).not.toBeNull();
    expect(labels?.closest(".hidden")).not.toBeNull();
    expect(settings?.closest(".hidden")).toBeNull();

    await act(async () => root.unmount());
  });
});
