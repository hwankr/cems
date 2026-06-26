"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import {
  editProfileAction,
  type EditProfileState,
} from "../actions/edit-profile";

const initialState: EditProfileState = { error: null };

export function ProfileEditForm({
  displayName,
  handle,
  bio,
}: {
  displayName: string;
  handle: string | null;
  bio: string | null;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.me.edit;
  const [state, formAction, pending] = useActionState(
    editProfileAction,
    initialState,
  );

  const errorText: Record<NonNullable<EditProfileState["error"]>, string> = {
    "display-name-required": copy.errorDisplayNameRequired,
    "display-name-too-long": copy.errorDisplayNameTooLong,
    "handle-invalid": copy.errorHandleInvalid,
    "handle-taken": copy.errorHandleTaken,
    "bio-too-long": copy.errorBioTooLong,
    unknown: copy.errorUnknown,
  };

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
    >
      <input type="hidden" name="locale" value={locale} />

      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">{copy.displayName}</span>
        <input
          name="displayName"
          defaultValue={displayName}
          maxLength={30}
          required
          className="h-10 rounded-lg border border-line bg-inset px-3 text-sm text-ink"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">{copy.handle}</span>
        <input
          name="handle"
          defaultValue={handle ?? ""}
          placeholder="@eco_hwan"
          maxLength={21}
          className="h-10 rounded-lg border border-line bg-inset px-3 text-sm text-ink"
        />
        <span className="text-xs text-ink-subtle">{copy.handleHint}</span>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">{copy.bio}</span>
        <textarea
          name="bio"
          defaultValue={bio ?? ""}
          maxLength={80}
          rows={2}
          className="rounded-lg border border-line bg-inset px-3 py-2 text-sm text-ink"
        />
        <span className="text-xs text-ink-subtle">{copy.bioHint}</span>
      </label>

      {state.error ? (
        <p className="text-sm font-medium text-overuse">
          {errorText[state.error]}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60"
        >
          {pending ? copy.saving : copy.save}
        </button>
        <Link
          href={`/${locale}/me`}
          className="h-10 rounded-lg border border-line px-4 text-sm font-medium leading-10 text-ink-muted"
        >
          {copy.cancel}
        </Link>
      </div>
    </form>
  );
}
