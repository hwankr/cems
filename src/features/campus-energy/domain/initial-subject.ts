type SubjectIdentity = {
  id: string;
};

export function resolveInitialMainSubjectId(
  orgSubjectId: string | null | undefined,
  subjects: readonly SubjectIdentity[],
): string {
  if (!orgSubjectId) return "";

  return subjects.some((subject) => subject.id === orgSubjectId)
    ? orgSubjectId
    : "";
}
