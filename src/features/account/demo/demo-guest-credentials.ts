import "server-only";
import type { DemoGuestKey } from "./demo-guest-personas";

type DemoGuestCredential = {
  email: string;
  password: string;
};

const demoGuestEmails: Record<DemoGuestKey, string> = {
  "engineering-leader": "guest1@cems.demo",
  "humanities-leader": "guest7@cems.demo",
  "estate-builder": "guest12@cems.demo",
};

export type DemoGuestCredentialError =
  | "disabled"
  | "missing-password"
  | "invalid-guest";

export function resolveDemoGuestCredential(
  key: DemoGuestKey,
): DemoGuestCredential | { error: DemoGuestCredentialError } {
  if (process.env.CEMS_DEMO_GUEST_LOGIN_ENABLED !== "true") {
    return { error: "disabled" };
  }

  const password = process.env.CEMS_DEMO_GUEST_PASSWORD;
  if (!password) {
    return { error: "missing-password" };
  }

  const email = demoGuestEmails[key];
  if (!email) {
    return { error: "invalid-guest" };
  }

  return { email, password };
}
