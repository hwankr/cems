/** Raw row shape returned by the get_subject_contributor_rankings RPC. */
export type ContributorRow = {
  subject_id: string;
  user_id: string;
  display_name: string;
  points: number;
  rank: number;
  is_me: boolean;
};

/** One contributor in a building's ranking preview. */
export type SubjectContributor = {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
  isMe: boolean;
};

/** Map of estate subject id → its top-N contributors, ordered by rank. */
export type SubjectContributorRankings = Record<string, SubjectContributor[]>;

/**
 * Groups flat RPC rows into per-subject contributor lists and maps the
 * snake_case DB columns to camelCase. Each subject's list is sorted by
 * ascending rank so the UI can render it directly.
 */
export function groupContributorRowsBySubject(
  rows: readonly ContributorRow[],
): SubjectContributorRankings {
  const bySubject: SubjectContributorRankings = {};
  for (const row of rows) {
    const list = (bySubject[row.subject_id] ??= []);
    list.push({
      userId: row.user_id,
      displayName: row.display_name,
      points: row.points,
      rank: row.rank,
      isMe: row.is_me,
    });
  }
  for (const subjectId of Object.keys(bySubject)) {
    bySubject[subjectId].sort((a, b) => a.rank - b.rank);
  }
  return bySubject;
}
