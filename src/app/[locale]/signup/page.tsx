import { notFound } from "next/navigation";
import { AuthShell } from "@/features/account/components/auth-shell";
import { SignupForm } from "@/features/account/components/signup-form";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type SignupPageProps = { params: Promise<{ locale: string }> };

export default async function SignupPage({ params }: SignupPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <AuthShell
        brandName={messages.app.brandName}
        eyebrow={messages.app.eyebrow}
        tagline={messages.account.brand.tagline}
        values={messages.account.brand.values}
        title={messages.account.signup.title}
        subtitle={messages.account.signup.subtitle}
      >
        <SignupForm />
      </AuthShell>
    </CampusEnergyProviders>
  );
}
