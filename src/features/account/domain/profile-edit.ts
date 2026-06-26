export type ProfileEditDraft = {
  displayName: string;
  handle: string;
  bio: string;
};

export type ProfileEditError =
  | "display-name-required"
  | "display-name-too-long"
  | "handle-invalid"
  | "bio-too-long";

export type ProfileEditResult =
  | {
      ok: true;
      value: { displayName: string; handle: string | null; bio: string | null };
    }
  | { ok: false; error: ProfileEditError };

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const DISPLAY_NAME_MAX = 30;
const BIO_MAX = 80;

export function validateProfileEdit(draft: ProfileEditDraft): ProfileEditResult {
  const displayName = draft.displayName.trim();
  if (displayName.length === 0) return { ok: false, error: "display-name-required" };
  if (displayName.length > DISPLAY_NAME_MAX) {
    return { ok: false, error: "display-name-too-long" };
  }

  const handleRaw = draft.handle.trim().replace(/^@/, "").toLowerCase();
  const handle = handleRaw === "" ? null : handleRaw;
  if (handle !== null && !HANDLE_RE.test(handle)) {
    return { ok: false, error: "handle-invalid" };
  }

  const bioTrim = draft.bio.trim();
  if (bioTrim.length > BIO_MAX) return { ok: false, error: "bio-too-long" };
  const bio = bioTrim === "" ? null : bioTrim;

  return { ok: true, value: { displayName, handle, bio } };
}
