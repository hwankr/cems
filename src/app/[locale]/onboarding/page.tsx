import { notFound, redirect } from "next/navigation";
import { AuthShell } from "@/features/account/components/auth-shell";
import { OnboardingForm } from "@/features/account/components/onboarding-form";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupOptions,
  getSchoolOptions,
} from "@/features/account/data/account-dal";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
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
      <AuthShell
        brandName={messages.app.brandName}
        eyebrow={messages.app.eyebrow}
        tagline={messages.account.brand.tagline}
        values={messages.account.brand.values}
        title={messages.account.onboarding.title}
        subtitle={messages.account.onboarding.description}
      >
        <OnboardingForm schools={schools} groups={groups} />
      </AuthShell>
    </CampusEnergyProviders>
  );
}
