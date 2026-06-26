export type GroupContribution = {
  userId: string;
  points: number;
};

export type GroupPointPool = {
  groupId: string;
  earnedPoints: number;
  memberCount: number;
};

export function calculateGroupPointPool(
  groupId: string,
  contributions: readonly GroupContribution[],
): GroupPointPool {
  const earnedPoints = contributions.reduce(
    (sum, current) => sum + Math.max(0, current.points),
    0,
  );

  return {
    groupId,
    earnedPoints,
    memberCount: contributions.length,
  };
}
