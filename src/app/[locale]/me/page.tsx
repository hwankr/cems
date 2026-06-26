import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { SignOutButton } from "@/features/account/components/sign-out-button";
import { ProfileHero } from "@/features/account/components/profile-hero";
import { AchievementHighlights } from "@/features/account/components/achievement-highlights";
import { ContributionGraph } from "@/features/account/components/contribution-graph";
import { PointsHistory } from "@/features/account/components/points-history";
import { EstateContribution } from "@/features/account/components/estate-contribution";
import { GoalList } from "@/features/missions/components/goal-list";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupEstateSubjectId,
  getGroupPointPool,
  getMyPointEvents,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
import { getGoalsWithProgress } from "@/features/missions/data/missions-dal";
import {
  buildContributionGraph,
  seoulDayLabel,
} from "@/features/account/domain/contribution";
import { deriveAchievements } from "@/features/account/domain/achievements";
import { countMissionCheckIns } from "@/features/account/domain/points";
import { getCharacterProgress } from "@/features/campus-energy/domain/scoring";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type MePageProps = { params: Promise<{ locale: string }> };

const GRAPH_WEEKS = 26;

export default async function MePage({ params }: MePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, personalPoints, groupPool, events, goals, estateSubjectId] =
    await Promise.all([
      getMessages(locale),
      getPersonalPointTotal(profile.userId),
      getGroupPointPool(profile.groupId),
      getMyPointEvents(profile.userId),
      getGoalsWithProgress(profile.userId),
      getGroupEstateSubjectId(profile.groupId),
    ]);

  const todayLabel = seoulDayLabel(new Date().toISOString());
  const graph = buildContributionGraph(events, { todayLabel, weeks: GRAPH_WEEKS });
  const achievements = deriveAchievements({
    level: getCharacterProgress(personalPoints).level,
    longestStreak: graph.longestStreak,
    totalCheckIns: countMissionCheckIns(events),
  });

  const estateHref = estateSubjectId
    ? `/${locale}/subjects/${estateSubjectId}/estate`
    : `/${locale}`;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}`} className="text-sm font-medium text-ink-muted">
            ← {messages.me.backToMap}
          </Link>
          <SignOutButton />
        </header>
        <ProfileHero
          displayName={profile.displayName}
          handle={profile.handle}
          bio={profile.bio}
          personalPoints={personalPoints}
          currentStreak={graph.currentStreak}
        />
        <AchievementHighlights achievements={achievements} />
        <ContributionGraph graph={graph} />
        <GoalList goals={goals} />
        <EstateContribution
          personalPoints={personalPoints}
          groupPoolPoints={groupPool.earnedPoints}
          estateHref={estateHref}
        />
        <PointsHistory events={events} />
      </main>
    </CampusEnergyProviders>
  );
}
