import { notFound } from "next/navigation";
import { AuthShell } from "@/features/account/components/auth-shell";
import { DemoGuestEntry } from "@/features/account/components/demo-guest-entry";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const { next } = await searchParams;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <AuthShell
        brandName={messages.app.brandName}
        title={messages.account.login.title}
        subtitle={messages.account.login.subtitle}
      >
        <DemoGuestEntry next={next} />
      </AuthShell>
    </CampusEnergyProviders>
  );
}
