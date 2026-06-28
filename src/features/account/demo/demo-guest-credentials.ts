import "server-only";
import {
  getDemoGuestDisplayPersonas,
  representativeDemoGuestPersona,
  type DemoGuestKey,
  type DemoGuestPersona,
} from "./demo-guest-personas";

type DemoGuestCredential = {
  email: string;
  password: string;
};

const DEFAULT_DEMO_GUEST_EMAIL = "demo@cems.kr";
const DEMO_GUEST_PASSWORD = "CemsDemo!2026";

export type DemoGuestCredentialError = "invalid-guest";

export function getConfiguredDemoGuestPersonas(): readonly DemoGuestPersona[] {
  return getDemoGuestDisplayPersonas();
}

export function resolveDemoGuestCredential(
  key: DemoGuestKey,
): DemoGuestCredential | { error: DemoGuestCredentialError } {
  if (key !== representativeDemoGuestPersona.key) {
    return { error: "invalid-guest" };
  }

  return {
    email: DEFAULT_DEMO_GUEST_EMAIL,
    password: DEMO_GUEST_PASSWORD,
  };
}
