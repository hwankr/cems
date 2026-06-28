import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDemoGuestCredential } from "../demo/demo-guest-credentials";
import type { DemoGuestKey } from "../demo/demo-guest-personas";

vi.mock("server-only", () => ({}));

const DEMO_ENV_KEYS = [
  "CEMS_DEMO_GUEST_EMAIL",
  "CEMS_DEMO_GUEST_PASSWORD",
] as const;

type DemoEnvKey = (typeof DEMO_ENV_KEYS)[number];

describe("resolveDemoGuestCredential", () => {
  let originalEnv: Record<DemoEnvKey, string | undefined>;

  beforeEach(() => {
    originalEnv = Object.fromEntries(
      DEMO_ENV_KEYS.map((key) => [key, process.env[key]]),
    ) as Record<DemoEnvKey, string | undefined>;

    for (const key of DEMO_ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of DEMO_ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("resolves the hardcoded representative demo account without runtime env", () => {
    expect(resolveDemoGuestCredential("complete-demo")).toEqual({
      email: "demo@cems.kr",
      password: "CemsDemo!2026",
    });
  });

  it("keeps the presentation credential fixed when legacy env vars are present", () => {
    process.env.CEMS_DEMO_GUEST_EMAIL = " demo-local@cems.kr ";
    process.env.CEMS_DEMO_GUEST_PASSWORD = "shared-demo-password";

    expect(resolveDemoGuestCredential("complete-demo")).toEqual({
      email: "demo@cems.kr",
      password: "CemsDemo!2026",
    });
  });

  it("rejects retired demo guest keys", () => {
    expect(
      resolveDemoGuestCredential("engineering-leader" as DemoGuestKey),
    ).toEqual({
      error: "invalid-guest",
    });
  });
});
