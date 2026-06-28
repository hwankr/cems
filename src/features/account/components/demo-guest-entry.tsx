import { getConfiguredDemoGuestPersonas } from "../demo/demo-guest-credentials";
import { DemoGuestEntryClient } from "./demo-guest-entry-client";

export function DemoGuestEntry({ next }: { next?: string }) {
  return (
    <DemoGuestEntryClient
      guests={getConfiguredDemoGuestPersonas()}
      next={next}
    />
  );
}
