import Link from "next/link";
import { Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { ProfileHero } from "@/features/account/components/profile-hero";
import { AchievementHighlights } from "@/features/account/components/achievement-highlights";
import { ContributionGraph } from "@/features/account/components/contribution-graph";
import { PointsHistory } from "@/features/account/components/points-history";
import { EstateContribution } from "@/features/account/components/estate-contribution";
import { ClaimRewardButton } from "@/features/account/components/claim-reward-button";
import { DailyQuiz } from "@/features/quiz/components/daily-quiz";
import { GoalList } from "@/features/missions/components/goal-list";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupEstateSubjectId,
  getGroupPointPool,
  getMyPointEvents,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
import { getMyLeagueAwards } from "@/features/leagues/data/leagues-dal";
import { getGoalsWithProgress } from "@/features/missions/data/missions-dal";
import { getTodayQuiz } from "@/features/quiz/data/quiz-dal";
import {
  buildContributionGraph,
  seoulDayLabel,
} from "@/features/account/domain/contribution";
import { deriveAchievements } from "@/features/account/domain/achievements";
import { countMissionCheckIns } from "@/features/account/domain/points";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "@/features/account/components/profile-surface.module.css";

type MePageProps = { params: Promise<{ locale: string }> };

const GRAPH_WEEKS = 26;

export default async function MePage({ params }: MePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [
    messages,
    personalPoints,
    groupPool,
    events,
    goals,
    estateSubjectId,
    myLeagueAwards,
    quiz,
  ] = await Promise.all([
    getMessages(locale),
    getPersonalPointTotal(profile.userId),
    getGroupPointPool(profile.groupId),
    getMyPointEvents(profile.userId),
    getGoalsWithProgress(profile.userId),
    getGroupEstateSubjectId(profile.groupId),
    getMyLeagueAwards(profile.userId),
    getTodayQuiz(),
  ]);

  const todayLabel = seoulDayLabel(new Date().toISOString());
  const graph = buildContributionGraph(events, { todayLabel, weeks: GRAPH_WEEKS });
  const topStudentAward = myLeagueAwards[0] ?? null;
  const achievements = deriveAchievements({
    level: getCharacterProgress(personalPoints).level,
    longestStreak: graph.longestStreak,
    totalCheckIns: countMissionCheckIns(events),
    hasTopStudentAward: Boolean(topStudentAward),
    ...(topStudentAward ? { topStudentTier: topStudentAward.tier } : {}),
  });

  const estateHref = estateSubjectId
    ? `/${locale}/subjects/${estateSubjectId}/estate`
    : `/${locale}`;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className={styles.surface}>
        <div className={styles.sheet}>
          <ProfileHero
            displayName={profile.displayName}
            handle={profile.handle}
            bio={profile.bio}
            personalPoints={personalPoints}
            currentStreak={graph.currentStreak}
            estateHref={estateHref}
          />
          <AchievementHighlights achievements={achievements} />
          <Link
            href={`/${locale}/leagues`}
            className="mx-4 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-3"
          >
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#a07a00]" aria-hidden="true" />
              {messages.leagues.title}
            </span>
            <span className="text-ink-subtle">→</span>
          </Link>
          <ContributionGraph graph={graph} />
          <DailyQuiz quiz={quiz} />
          <GoalList goals={goals} />
          <EstateContribution
            personalPoints={personalPoints}
            groupPoolPoints={groupPool.earnedPoints}
            action={<ClaimRewardButton />}
          />
          <PointsHistory events={events} />
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
