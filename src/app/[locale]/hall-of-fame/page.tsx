import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
          <header className="flex items-center justify-between gap-3 px-1">
            <div>
              <h1 className="text-lg font-bold text-ink">{copy.title}</h1>
              <p className="text-xs text-ink-subtle">{copy.subtitle}</p>
            </div>
            <Link
              href={`/${locale}`}
              className="flex flex-none items-center gap-1 rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-subtle transition hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.back}
            </Link>
          </header>

          {sections.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
              <p className="text-sm font-semibold text-ink">{copy.empty}</p>
              <p className="text-xs text-ink-subtle">{copy.emptyHint}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sections.map(({ league, awards }) => (
                <LeagueHallSection
                  key={league.id}
                  league={league}
                  awards={awards}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </CampusEnergyProviders>
  );
}
