import "server-only";
import {
  getDemoGuestDisplayPersonas,
  singleDemoGuestPersona,
  type DemoGuestKey,
  type DemoGuestPersona,
} from "./demo-guest-personas";

type DemoGuestCredential = {
  email: string;
  password: string;
};

const seededDemoGuestEmails: Partial<Record<DemoGuestKey, string>> = {
  "engineering-leader": "guest1@cems.demo",
  "humanities-leader": "guest7@cems.demo",
  "estate-builder": "guest12@cems.demo",
};

export type DemoGuestCredentialError =
  | "disabled"
  | "missing-password"
  | "invalid-guest";

function readSingleDemoGuestEmail() {
  return process.env.CEMS_DEMO_GUEST_SINGLE_EMAIL?.trim() ?? "";
}

export function getConfiguredDemoGuestPersonas(): readonly DemoGuestPersona[] {
  return getDemoGuestDisplayPersonas({
    singleAccount: readSingleDemoGuestEmail().length > 0,
  });
}

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

  const singleEmail = readSingleDemoGuestEmail();
  if (singleEmail) {
    if (key !== singleDemoGuestPersona.key) {
      return { error: "invalid-guest" };
    }

    return { email: singleEmail, password };
  }

  const email = seededDemoGuestEmails[key];
  if (!email) {
    return { error: "invalid-guest" };
  }

  return { email, password };
}
