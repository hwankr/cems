"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import {
  completeCheckpointAction,
  type CompleteCheckpointState,
} from "../actions/complete-mission";

const initialState: CompleteCheckpointState = { status: "idle" };

export type CheckpointScanTarget = {
  code: string;
  routeTitle: string;
  stepTitle: string;
  location: string;
  stepOrder: number;
  totalSteps: number;
  rewardPoints: number;
};

export function CheckpointConfirm({
  checkpoint,
}: {
  checkpoint: CheckpointScanTarget;
}) {
  const { locale, messages } = useI18n();
  const scan = messages.scan;
  const [state, formAction, pending] = useActionState(
    completeCheckpointAction,
    initialState,
  );
  const reward = formatPoints(locale, checkpoint.rewardPoints);

  if (
    state.status === "completed" ||
    state.status === "already" ||
    state.status === "step" ||
    state.status === "already-step"
  ) {
    const text =
      state.status === "completed"
        ? interpolate(scan.checkpointCompleted, { points: reward })
        : state.status === "already"
          ? scan.checkpointAlready
          : state.status === "already-step"
            ? scan.checkpointAlreadyStep
            : interpolate(scan.checkpointStepDone, {
                current: checkpoint.stepOrder,
                total: checkpoint.totalSteps,
              });

    return (
      <div className="grid gap-4 text-center">
        <p className="text-lg font-semibold text-ink">{text}</p>
        <div className="grid gap-2">
          <Link
            href={`/${locale}/me`}
            className="h-11 rounded-xl bg-accent text-center font-semibold leading-[2.75rem] text-white"
          >
            {scan.toMyPage}
          </Link>
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-ink-muted"
          >
            {scan.toMap}
          </Link>
        </div>
      </div>
    );
  }

  const error =
    state.status === "out-of-order"
      ? scan.checkpointOutOfOrder
      : state.status === "invalid"
        ? scan.checkpointInvalid
        : state.status === "error"
          ? scan.error
          : null;

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="code" value={checkpoint.code} />
      <input type="hidden" name="locale" value={locale} />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          {interpolate(scan.checkpointLabel, {
            current: checkpoint.stepOrder,
            total: checkpoint.totalSteps,
          })}
        </p>
        <h1 className="mt-2 text-xl font-semibold text-ink">
          {checkpoint.routeTitle}
        </h1>
        <p className="mt-1 text-base font-medium text-ink">
          {checkpoint.stepTitle}
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">{checkpoint.location}</p>
        <p className="mt-2 text-sm font-semibold text-accent">
          {interpolate(scan.checkpointReward, { points: reward })}
        </p>
      </div>
      {error ? <p className="text-sm text-overuse">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? scan.checkpointConfirming : scan.checkpointConfirm}
      </button>
    </form>
  );
}
