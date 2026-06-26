import type {
  GroupOption,
  ProfileDraft,
  ProfileValidationError,
} from "./types";

const MAX_DISPLAY_NAME_LENGTH = 40;

export type ProfileValidationResult =
  | { ok: true; value: ProfileDraft }
  | { ok: false; error: ProfileValidationError };

export function validateProfileDraft(
  draft: ProfileDraft,
  groups: readonly GroupOption[],
): ProfileValidationResult {
  const displayName = draft.displayName.trim();

  if (displayName.length === 0) {
    return { ok: false, error: "display-name-required" };
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { ok: false, error: "display-name-too-long" };
  }

  if (draft.schoolId.length === 0) {
    return { ok: false, error: "school-required" };
  }

  const group = groups.find((candidate) => candidate.id === draft.groupId);

  if (!group) {
    return { ok: false, error: "group-required" };
  }

  if (group.schoolId !== draft.schoolId) {
    return { ok: false, error: "group-school-mismatch" };
  }

  return {
    ok: true,
    value: { displayName, schoolId: draft.schoolId, groupId: draft.groupId },
  };
}
