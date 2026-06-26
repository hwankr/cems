import type { PointEvent } from "./points";

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Points-per-day thresholds → level 0..4. Tunable.
const THRESHOLDS = [80, 200, 400] as const;

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionCell = {
  date: string; // YYYY-MM-DD (Asia/Seoul)
  points: number;
  level: ContributionLevel;
  future: boolean; // after today (trailing cells in the current week)
};

export type ContributionGraph = {
  weeks: ContributionCell[][]; // columns; each is 7 cells Sun..Sat
  monthLabels: { weekIndex: number; month: number }[];
  totalPoints: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
};

export function seoulDayLabel(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + SEOUL_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function contributionLevel(points: number): ContributionLevel {
  if (points <= 0) return 0;
  if (points < THRESHOLDS[0]) return 1;
  if (points < THRESHOLDS[1]) return 2;
  if (points < THRESHOLDS[2]) return 3;
  return 4;
}

// Treat a YYYY-MM-DD as a UTC midnight instant for deterministic day math.
function labelToUtc(label: string): number {
  return Date.parse(`${label}T00:00:00Z`);
}
function utcToLabel(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function addDays(label: string, delta: number): string {
  return utcToLabel(labelToUtc(label) + delta * DAY_MS);
}
function dayOfWeek(label: string): number {
  return new Date(labelToUtc(label)).getUTCDay(); // 0=Sun..6=Sat
}

export function buildContributionGraph(
  events: readonly PointEvent[],
  options: { todayLabel: string; weeks: number },
): ContributionGraph {
  const { todayLabel, weeks } = options;

  // Sum points per Seoul day.
  const byDay = new Map<string, number>();
  for (const e of events) {
    const day = seoulDayLabel(e.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + Math.max(0, e.points));
  }

  // Grid start = Sunday of the column that is (weeks-1) weeks before today's week.
  const todaySunday = addDays(todayLabel, -dayOfWeek(todayLabel));
  const start = addDays(todaySunday, -(weeks - 1) * 7);

  const grid: ContributionCell[][] = [];
  const monthLabels: { weekIndex: number; month: number }[] = [];
  let prevMonth = -1;
  let totalPoints = 0;
  let activeDays = 0;

  for (let w = 0; w < weeks; w += 1) {
    const week: ContributionCell[] = [];
    const columnSunday = addDays(start, w * 7);
    const month = Number(columnSunday.slice(5, 7));
    if (month !== prevMonth) {
      monthLabels.push({ weekIndex: w, month });
      prevMonth = month;
    }
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(columnSunday, d);
      const future = date > todayLabel;
      const points = future ? 0 : byDay.get(date) ?? 0;
      if (!future && points > 0) {
        totalPoints += points;
        activeDays += 1;
      }
      week.push({ date, points, level: contributionLevel(points), future });
    }
    grid.push(week);
  }

  const { currentStreak, longestStreak } = computeStreaks(byDay, todayLabel);

  return {
    weeks: grid,
    monthLabels,
    totalPoints,
    activeDays,
    currentStreak,
    longestStreak,
  };
}

function computeStreaks(
  byDay: ReadonlyMap<string, number>,
  todayLabel: string,
): { currentStreak: number; longestStreak: number } {
  const active = new Set<string>();
  for (const [day, pts] of byDay) if (pts > 0) active.add(day);

  // Current streak: walk back from today; allow today to be inactive (grace).
  let cursor = active.has(todayLabel) ? todayLabel : addDays(todayLabel, -1);
  let currentStreak = 0;
  while (active.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest streak: scan sorted active days.
  const sorted = [...active].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    prev = day;
  }

  return { currentStreak, longestStreak };
}
