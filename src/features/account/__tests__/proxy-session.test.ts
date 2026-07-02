import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getUser = vi.fn();
  const createServerClient = vi.fn(() => ({
    auth: {
      getUser,
    },
  }));

  return { createServerClient, getUser };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { updateSupabaseSession } from "../supabase/proxy-session";

const supabaseUrl = "https://zvuqmagfpdyrrzyjntue.supabase.co";
const authCookieName = "sb-zvuqmagfpdyrrzyjntue-auth-token";

function makeRequest() {
  return new NextRequest("https://cems.test/ko", {
    headers: {
      cookie: [
        `${authCookieName}=stale`,
        `${authCookieName}.0=stale-0`,
        `${authCookieName}.1=stale-1`,
        `${authCookieName}-code-verifier=stale-code`,
        "cems-locale=ko",
      ].join("; "),
    },
  });
}

describe("updateSupabaseSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    mocks.createServerClient.mockClear();
    mocks.getUser.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("expires stale Supabase auth cookies when the refresh token is missing", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: {
        __isAuthError: true,
        status: 400,
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token: Refresh Token Not Found",
      },
    });

    const response = await updateSupabaseSession(makeRequest());
    const setCookie = response.headers.getSetCookie().join("\n");

    expect(setCookie).toContain(`${authCookieName}=;`);
    expect(setCookie).toContain(`${authCookieName}.0=;`);
    expect(setCookie).toContain(`${authCookieName}.1=;`);
    expect(setCookie).toContain(`${authCookieName}-code-verifier=;`);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });

  it("expires stale Supabase auth cookies when the refresh token error is thrown", async () => {
    mocks.getUser.mockRejectedValue({
      __isAuthError: true,
      status: 400,
      code: "refresh_token_not_found",
      message: "Invalid Refresh Token: Refresh Token Not Found",
    });

    const response = await updateSupabaseSession(makeRequest());
    const setCookie = response.headers.getSetCookie().join("\n");

    expect(setCookie).toContain(`${authCookieName}=;`);
    expect(setCookie).toContain(`${authCookieName}.0=;`);
    expect(setCookie).toContain(`${authCookieName}.1=;`);
    expect(setCookie).toContain(`${authCookieName}-code-verifier=;`);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });

  it("skips Supabase client creation when the request has no auth token cookie", async () => {
    const response = await updateSupabaseSession(
      new NextRequest("https://cems.test/ko/login", {
        headers: { cookie: "cems-locale=ko" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
