import { getRedirectUrl } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { localeCookieName } from "../i18n/config";
import { proxy } from "../proxy";

describe("locale proxy", () => {
  it("redirects root requests to Korean by default", () => {
    const response = proxy(new NextRequest("https://cems.test/"));

    expect(getRedirectUrl(response)).toBe("https://cems.test/ko");
  });

  it("redirects locale-less paths to the saved locale cookie", () => {
    const request = new NextRequest("https://cems.test/dashboard");
    request.cookies.set(localeCookieName, "en");

    const response = proxy(request);

    expect(getRedirectUrl(response)).toBe("https://cems.test/en/dashboard");
  });

  it("does not redirect requests that already include a locale", () => {
    const response = proxy(new NextRequest("https://cems.test/ko"));

    expect(response?.status).toBe(200);
  });
});
