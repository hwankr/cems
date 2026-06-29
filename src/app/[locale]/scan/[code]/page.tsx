import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { CheckpointConfirm } from "@/features/missions/components/checkpoint-confirm";
import { MissionConfirm } from "@/features/missions/components/mission-confirm";
import { getScanTarget } from "@/features/missions/data/missions-dal";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type ScanPageProps = {
  params: Promise<{ locale: string; code: string }>;
};

export default async function ScanPage({ params }: ScanPageProps) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/scan/${code}`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, target] = await Promise.all([
    getMessages(locale),
    getScanTarget(code),
  ]);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
        {target?.kind === "mission" ? (
          <MissionConfirm code={target.code} points={target.points} />
        ) : target?.kind === "checkpoint" ? (
          <CheckpointConfirm checkpoint={target} />
        ) : (
          <div className="grid gap-3 text-center">
            <h1 className="text-xl font-semibold text-ink">
              {messages.scan.invalidTitle}
            </h1>
            <p className="text-sm text-ink-muted">{messages.scan.invalidBody}</p>
            <Link
              href={`/${locale}/me`}
              className="text-sm font-semibold text-accent"
            >
              {messages.scan.toMyPage}
            </Link>
          </div>
        )}
      </main>
    </CampusEnergyProviders>
  );
}
