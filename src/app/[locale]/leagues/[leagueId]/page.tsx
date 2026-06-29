import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import {
  getJoinableLeagues,
  getLeague,
  getLeagueAwards,
  getLeagueParticipantCount,
  getLeagueStandings,
} from "@/features/leagues/data/leagues-dal";
import { AwardPodium } from "@/features/leagues/components/award-podium";
import { StudentWinners } from "@/features/leagues/components/student-winners";
import { LeagueStandingsTable } from "@/features/leagues/components/league-standings-table";
import { LeagueStatusBadge } from "@/features/leagues/components/league-status-badge";
import { JoinLeagueButton } from "@/features/leagues/components/join-league-button";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/interpolate";
import { formatNumber } from "@/i18n/format";
import styles from "@/features/account/components/profile-surface.module.css";
import leagueStyles from "@/features/leagues/components/league-hall.module.css";

type DetailProps = { params: Promise<{ locale: string; leagueId: string }> };

export async function generateMetadata({ params }: DetailProps): Promise<Metadata> {
  const { locale, leagueId } = await params;
  if (!isLocale(locale)) notFound();
  const league = await getLeague(leagueId);
  const messages = await getMessages(locale);
  return { title: league ? league.name : messages.leagues.title };
}

function shortDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export default async function LeagueDetailPage({ params }: DetailProps) {
  const { locale, leagueId } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/leagues/${leagueId}`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const messages = await getMessages(locale);
  const copy = messages.leagues;

  const [participantCount, joinable] = await Promise.all([
    getLeagueParticipantCount(leagueId),
    getJoinableLeagues(profile.groupId),
  ]);
  const canJoin = joinable.some((l) => l.id === leagueId);

  const isFinalized = league.status === "finalized";
  const awards = isFinalized ? await getLeagueAwards(leagueId) : null;
  const standings = isFinalized ? [] : await getLeagueStandings(leagueId);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className={styles.surface}>
        <div className={styles.sheet}>
          <div className={leagueStyles.hero}>
            <div className={leagueStyles.heroBloom} />
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              <Link
                href={`/${locale}/leagues`}
                aria-label={copy.detailBack}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <h1 className="text-lg font-bold text-white">{league.name}</h1>
              <p className="mt-0.5 text-xs text-white/85">
                {interpolate(copy.period, { start: shortDate(locale, league.startsAt), end: shortDate(locale, league.endsAt) })}
                {" · "}
                {interpolate(copy.participants, { count: formatNumber(locale, participantCount) })}
              </p>
            </div>
          </div>

          <section className={styles.section}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <LeagueStatusBadge status={league.status} />
              {canJoin ? <JoinLeagueButton leagueId={league.id} /> : null}
            </div>

            {isFinalized && awards ? (
              <div className="flex flex-col gap-4">
                <AwardPodium teams={awards.teams} />
                <StudentWinners students={awards.students} />
              </div>
            ) : (
              <LeagueStandingsTable standings={standings} myCompetitorId={profile.groupId} />
            )}
          </section>
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
