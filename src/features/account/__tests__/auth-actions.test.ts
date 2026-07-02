import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoGuestActionState } from "../actions/auth";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => {
  const redirect = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  const signInWithPassword = vi.fn();
  const signOut = vi.fn();
  const signUp = vi.fn();
  const createServerSupabaseClient = vi.fn(async () => ({
    auth: {
      signInWithPassword,
      signOut,
      signUp,
    },
  }));

  return {
    createServerSupabaseClient,
    redirect,
    signInWithPassword,
    signOut,
    signUp,
  };
});

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { signInDemoGuestAction, signOutAction } from "../actions/auth";

function makeFormData(entries: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("auth actions", () => {
  beforeEach(() => {
    mocks.createServerSupabaseClient.mockClear();
    mocks.redirect.mockClear();
    mocks.signInWithPassword.mockReset();
    mocks.signOut.mockReset();
    mocks.signUp.mockReset();
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ error: null });
  });

  it("enters the representative demo account without revoking other sessions", async () => {
    const prevState: DemoGuestActionState = { error: null };

    await expect(
      signInDemoGuestAction(
        "complete-demo",
        prevState,
        makeFormData({ locale: "ko" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/ko");

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "demo@cems.kr",
      password: "CemsDemo!2026",
    });
  });

  it("uses a local sign-out so one demo user does not sign out every judge", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT:/ko/login");

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
