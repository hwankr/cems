export type DemoHistoricalEarnedPointsBySubjectId = Readonly<
  Partial<Record<string, number>>
>;

// Demo-only carryover until a server API can return verified long-term accounts.
export const demoHistoricalEarnedPointsBySubjectId: DemoHistoricalEarnedPointsBySubjectId =
  {
    "yu-e21": 3200,
  };
