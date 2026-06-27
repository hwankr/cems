// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { koMessages } from "@/i18n/messages/ko";
import {
  CampusEnergyApp,
  type CampusEnergyAccount,
} from "../components/campus-energy-app";

vi.mock("../components/admin-map-view", () => ({
  AdminMapView: ({
    selectedSubjectId,
  }: {
    selectedSubjectId: string;
  }) => (
    <div
      data-testid="admin-map-view"
      data-selected-subject-id={selectedSubjectId}
    />
  ),
}));

vi.mock("../components/participant-dashboard", () => ({
  ParticipantDashboard: () => <div data-testid="participant-dashboard" />,
}));

vi.mock("../components/bottom-nav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}));

vi.mock("../components/app-header", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

vi.mock("@/features/account/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function account(orgSubjectId: string | null): CampusEnergyAccount {
  return {
    displayName: "Test User",
    groupId: "student-services",
    personalPoints: 0,
    groupPoolPoints: 0,
    groupMemberCount: 1,
    orgSubjectId,
  };
}

async function renderApp(orgSubjectId: string | null) {
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  document.body.append(container);

  await act(async () =>
    root.render(
      <CampusEnergyApp
        locale="ko"
        mapboxToken=""
        messages={koMessages}
        account={account(orgSubjectId)}
      />,
    ),
  );

  return { container, root };
}

describe("CampusEnergyApp", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("starts the admin map on the account organization building", async () => {
    const { container, root } = await renderApp("yu-b04");

    expect(
      container
        .querySelector('[data-testid="admin-map-view"]')
        ?.getAttribute("data-selected-subject-id"),
    ).toBe("yu-b04");

    await act(async () => root.unmount());
  });

  it("does not auto-select a demo building when the account has no organization building", async () => {
    const { container, root } = await renderApp(null);

    expect(
      container
        .querySelector('[data-testid="admin-map-view"]')
        ?.getAttribute("data-selected-subject-id"),
    ).toBe("");

    await act(async () => root.unmount());
  });
});
