"use client";

import { useFormStatus } from "react-dom";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { signOutAction } from "../actions/auth";

function SignOutSubmitButton({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className ?? "text-sm font-medium text-ink-muted"}
    >
      <PendingButtonContent
        pending={pending}
        idleLabel={label}
        pendingLabel={label}
        spinnerClassName="h-3 w-3"
      />
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const { messages } = useI18n();
  return (
    <form action={signOutAction}>
      <SignOutSubmitButton
        className={className}
        label={messages.account.signOut}
      />
    </form>
  );
}
