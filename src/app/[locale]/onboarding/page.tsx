import { notFound, redirect } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { OnboardingForm } from "@/features/account/components/onboarding-form";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupOptions,
  getSchoolOptions,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type OnboardingPageProps = { params: Promise<{ locale: string }> };

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const profile = await getCurrentProfile();
  if (profile) redirect(`/${locale}`);

  const [messages, schools, groups] = await Promise.all([
    getMessages(locale),
    getSchoolOptions(),
    getGroupOptions(),
  ]);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-5 px-5">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">
            {messages.account.onboarding.title}
          </h1>
          <p className="text-sm text-ink-muted">
            {messages.account.onboarding.description}
          </p>
        </div>
        <OnboardingForm schools={schools} groups={groups} />
      </main>
    </CampusEnergyProviders>
  );
}
