"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { formatPoints } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import {
  completeMissionAction,
  type CompleteMissionState,
} from "../actions/complete-mission";

const initialState: CompleteMissionState = { status: "idle" };

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

  if (state.status === "completed" || state.status === "already") {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-lg font-semibold text-ink">
          {state.status === "completed"
            ? interpolate(scan.completed, {
                points: formatPoints(locale, points),
              })
            : scan.already}
        </p>
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

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="locale" value={locale} />
      <div>
        <p className="text-xl font-semibold text-ink">
          {mission?.title ?? code}
        </p>
        {mission?.location ? (
          <p className="mt-0.5 text-sm text-ink-muted">{mission.location}</p>
        ) : null}
        <p className="mt-1 text-sm font-semibold text-accent">
          {interpolate(scan.missionPoints, {
            points: formatPoints(locale, points),
          })}
        </p>
      </div>
      {state.status === "error" || state.status === "invalid" ? (
        <p className="text-sm text-overuse">{scan.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
      >
        {pending ? scan.confirming : scan.confirm}
      </button>
    </form>
  );
}
