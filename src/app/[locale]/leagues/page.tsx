import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import {
  getFinalizedLeagues,
  getJoinableLeagues,
  getLeagueParticipantCount,
  getLeagueStandings,
  getMyGroupLeagues,
} from "@/features/leagues/data/leagues-dal";
import { LeagueCard } from "@/features/leagues/components/league-card";
import { LeagueStandingsTable } from "@/features/leagues/components/league-standings-table";
import { LeagueBrowseList } from "@/features/leagues/components/league-browse-list";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "@/features/account/components/profile-surface.module.css";
import leagueStyles from "@/features/leagues/components/league-hall.module.css";

type LeaguesProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LeaguesProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);
  return { title: messages.leagues.title };
}

export default async function LeaguesPage({ params }: LeaguesProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/leagues`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, myLeagues, joinable, finalized] = await Promise.all([
    getMessages(locale),
    getMyGroupLeagues(profile.groupId),
    getJoinableLeagues(profile.groupId),
    getFinalizedLeagues(),
  ]);

  // Active "my" leagues get a live standings preview; counts for cards.
  const activeMine = myLeagues.filter((l) => l.status === "active");
  const [activeStandings, myCounts, joinableCounts] = await Promise.all([
    Promise.all(activeMine.map((l) => getLeagueStandings(l.id))),
    Promise.all(myLeagues.map((l) => getLeagueParticipantCount(l.id))),
    Promise.all(joinable.map((l) => getLeagueParticipantCount(l.id))),
  ]);
  const standingsById = new Map(activeMine.map((l, i) => [l.id, activeStandings[i]]));
  const myCountById = new Map(myLeagues.map((l, i) => [l.id, myCounts[i]]));
  const joinableCountById: Record<string, number> = {};
  joinable.forEach((l, i) => (joinableCountById[l.id] = joinableCounts[i]));

  const copy = messages.leagues;

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className={styles.surface}>
        <div className={styles.sheet}>
          <div className={leagueStyles.hero}>
            <div className={leagueStyles.heroBloom} />
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              <Link
                href={`/${locale}`}
                aria-label={copy.back}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
                <Trophy className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white">{copy.title}</h1>
                <p className="truncate text-xs text-white/85">{copy.subtitle}</p>
              </div>
            </div>
          </div>

          {/* 진행 중 · 내 그룹 */}
          <section className={styles.section}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{copy.sections.active}</h2>
            {myLeagues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
                <p className="text-sm font-semibold text-ink">{copy.emptyActive}</p>
                <p className="mt-1 text-xs text-ink-subtle">{copy.emptyActiveHint}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myLeagues.map((league) => (
                  <div key={league.id} className="flex flex-col gap-2">
                    <LeagueCard
                      league={league}
                      participantCount={myCountById.get(league.id) ?? 0}
                      href={`/${locale}/leagues/${league.id}`}
                    />
                    {standingsById.has(league.id) ? (
                      <div className="px-1">
                        <LeagueStandingsTable
                          standings={(standingsById.get(league.id) ?? []).slice(0, 3)}
                          myCompetitorId={profile.groupId}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 리그 찾기 */}
          <section className={styles.section}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{copy.sections.browse}</h2>
            <LeagueBrowseList leagues={joinable} participantCounts={joinableCountById} />
          </section>

          {/* 지난 기록 */}
          <section className={styles.section}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{copy.sections.past}</h2>
            {finalized.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-ink-subtle">{copy.emptyPast}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {finalized.map((league) => (
                  <LeagueCard
                    key={league.id}
                    league={{ ...league, scope: "group", status: "finalized", isOpen: false }}
                    participantCount={0}
                    href={`/${locale}/leagues/${league.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
