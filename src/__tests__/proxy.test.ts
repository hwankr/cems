import { getRedirectUrl } from "next/experimental/testing/server";
import { NextResponse, NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localeCookieName } from "../i18n/config";

// The proxy refreshes the Supabase session before applying locale routing.
// That step needs env + network, so stub it here and assert only the
// locale-redirect behaviour the proxy owns.
const updateSupabaseSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../features/account/supabase/proxy-session", () => ({
  updateSupabaseSession: updateSupabaseSessionMock,
}));

import { proxy } from "../proxy";

describe("locale proxy", () => {
  beforeEach(() => {
    updateSupabaseSessionMock.mockReset();
    updateSupabaseSessionMock.mockResolvedValue(NextResponse.next());
  });

  it("redirects root requests to Korean by default", async () => {
    const response = await proxy(new NextRequest("https://cems.test/"));

    expect(getRedirectUrl(response)).toBe("https://cems.test/ko");
  });

  it("redirects locale-less paths to the saved locale cookie", async () => {
    const request = new NextRequest("https://cems.test/dashboard");
    request.cookies.set(localeCookieName, "en");

    const response = await proxy(request);

    expect(getRedirectUrl(response)).toBe("https://cems.test/en/dashboard");
  });

  it("does not redirect requests that already include a locale", async () => {
    const response = await proxy(new NextRequest("https://cems.test/ko"));

    expect(response?.status).toBe(200);
  });

  it("does not refresh Supabase sessions on auth entry routes", async () => {
    for (const pathname of [
      "/ko/login",
      "/ko/auth/callback",
      "/login",
      "/auth/callback",
    ]) {
      updateSupabaseSessionMock.mockClear();

      await proxy(new NextRequest(`https://cems.test${pathname}`));

      expect(updateSupabaseSessionMock).not.toHaveBeenCalled();
    }
  });

  it("refreshes Supabase sessions on protected localized routes", async () => {
    await proxy(new NextRequest("https://cems.test/ko/me"));

    expect(updateSupabaseSessionMock).toHaveBeenCalledOnce();
  });
});
