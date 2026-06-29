import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { LeagueHallSection } from "@/features/leagues/components/league-hall-section";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import {
  getFinalizedLeagues,
  getLeagueAwards,
} from "@/features/leagues/data/leagues-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "@/features/account/components/profile-surface.module.css";
import leagueStyles from "@/features/leagues/components/league-hall.module.css";

type HallOfFameProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: HallOfFameProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);
  return { title: messages.hallOfFame.title };
}

export default async function HallOfFamePage({ params }: HallOfFameProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/hall-of-fame`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, leagues] = await Promise.all([
    getMessages(locale),
    getFinalizedLeagues(),
  ]);

  const sections = await Promise.all(
    leagues.map(async (league) => ({
      league,
      awards: await getLeagueAwards(league.id),
    })),
  );

  const copy = messages.hallOfFame;

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

          {sections.length === 0 ? (
            <div className={styles.section}>
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-ink-subtle">
                  <Trophy className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-ink">{copy.empty}</p>
                <p className="text-xs text-ink-subtle">{copy.emptyHint}</p>
              </div>
            </div>
          ) : (
            sections.map(({ league, awards }) => (
              <div key={league.id} className={styles.section}>
                <LeagueHallSection league={league} awards={awards} />
              </div>
            ))
          )}
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
