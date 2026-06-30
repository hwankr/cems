"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { PendingButtonContent } from "@/features/ui/pending-button-content";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import styles from "./mission-confirm.module.css";
import {
  cancelMissionAction,
  completeMissionAction,
  type CancelMissionState,
  type CompleteMissionState,
} from "../actions/complete-mission";

const initialState: CompleteMissionState = { status: "idle" };
const cancelInitialState: CancelMissionState = { status: "idle" };

// Demo/testing helper: undo today's check-in so the mission can be scanned
// again. On success the page reloads to the fresh confirm form.
function CancelCheckInButton({ code }: { code: string }) {
  const { locale, messages } = useI18n();
  const [state, formAction, pending] = useActionState(
    cancelMissionAction,
    cancelInitialState,
  );

  useEffect(() => {
    if (state.status === "cancelled") {
      window.location.reload();
    }
  }, [state.status]);

  const busy = pending || state.status === "cancelled";

  return (
    <form action={formAction}>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className={styles.cancelButton}
      >
        <PendingButtonContent
          pending={busy}
          idleLabel={messages.scan.cancelTest}
          pendingLabel={messages.scan.cancelling}
          spinnerClassName="h-3 w-3"
        />
      </button>
    </form>
  );
}

export function MissionConfirm({
  code,
  points,
}: {
  code: string;
  points: number;
}) {
  const { locale, messages } = useI18n();
  const scan = messages.scan;
  const missions = messages.me.missions as Record<
    string,
    { title: string; location: string }
  >;
  const mission = missions[code];
  const [state, formAction, pending] = useActionState(
    completeMissionAction,
    initialState,
  );
  const formattedPoints = formatPoints(locale, points);
  const rewardPoints = `+${formattedPoints}`;
  const missionLocation = mission?.location ?? code;

  if (state.status === "completed" || state.status === "already") {
    const isCompleted = state.status === "completed";

    return (
      <div className={styles.shell}>
        <div className={styles.completion}>
          <div className={styles.completionMark} aria-hidden="true">
            {isCompleted ? "OK" : "!"}
          </div>
          <div>
            <h1 className={styles.completionTitle}>
              {isCompleted ? scan.completedTitle : scan.alreadyTitle}
            </h1>
            <p className={styles.completionBody}>
              {isCompleted
                ? interpolate(scan.completedBody, { points: formattedPoints })
                : scan.alreadyBody}
            </p>
          </div>
          <div className={styles.actions}>
            <Link href={`/${locale}/me`} className={styles.primaryLink}>
              {scan.toMyPage}
            </Link>
            <Link href={`/${locale}`} className={styles.secondaryLink}>
              {scan.toMap}
            </Link>
          </div>
          <div className={styles.cancelSlot}>
            <CancelCheckInButton code={code} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.shell}>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="locale" value={locale} />
      <div className={styles.hero}>
        <div className={styles.topline}>
          <span className={styles.brand}>CEMS</span>
          <span className={styles.eyebrow}>{scan.missionEyebrow}</span>
        </div>
        <div className={styles.arena}>
          <div className={styles.ring} aria-hidden="true">
            <div className={styles.badge}>{points}P</div>
          </div>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{mission?.title ?? code}</h1>
          <p className={styles.prompt}>
            {interpolate(scan.missionPrompt, { location: missionLocation })}
          </p>
        </div>
        <div
          className={styles.rewardStrip}
          aria-label={interpolate(scan.missionPoints, {
            points: formattedPoints,
          })}
        >
          <div className={styles.rewardItem}>
            <span className={styles.rewardValue}>{rewardPoints}</span>
            <span className={styles.rewardLabel}>{scan.rewardPoints}</span>
          </div>
          <div className={styles.rewardItem}>
            <span className={styles.rewardValue}>+1</span>
            <span className={styles.rewardLabel}>{scan.rewardCheckIn}</span>
          </div>
        </div>
        {state.status === "error" || state.status === "invalid" ? (
          <p className={styles.error}>{scan.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={styles.primaryButton}
        >
          <PendingButtonContent
            pending={pending}
            idleLabel={scan.confirm}
            pendingLabel={scan.confirming}
          />
        </button>
        <Link href={`/${locale}`} className={styles.secondaryLink}>
          {scan.toMap}
        </Link>
      </div>
    </form>
  );
}
