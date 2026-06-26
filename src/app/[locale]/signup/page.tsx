import { notFound } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { SignupForm } from "@/features/account/components/signup-form";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type SignupPageProps = { params: Promise<{ locale: string }> };

export default async function SignupPage({ params }: SignupPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
        <h1 className="text-2xl font-semibold">
          {messages.account.signup.title}
        </h1>
        <SignupForm />
      </main>
    </CampusEnergyProviders>
  );
}
