import type { ReactNode } from "react";

type PendingButtonContentProps = {
  pending: boolean;
  idleLabel: ReactNode;
  pendingLabel: ReactNode;
  className?: string;
  spinnerClassName?: string;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function PendingButtonContent({
  pending,
  idleLabel,
  pendingLabel,
  className,
  spinnerClassName,
}: PendingButtonContentProps) {
  return (
    <span
      className={joinClassNames(
        "inline-flex min-w-0 items-center justify-center gap-2",
        className,
      )}
    >
      {pending ? (
        <span
          aria-hidden="true"
          data-pending-spinner="true"
          className={joinClassNames(
            "h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
            spinnerClassName,
          )}
        />
      ) : null}
      <span className="min-w-0">{pending ? pendingLabel : idleLabel}</span>
    </span>
  );
}
