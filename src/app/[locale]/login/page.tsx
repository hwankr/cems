import { notFound } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { LoginForm } from "@/features/account/components/login-form";
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
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
        <h1 className="text-2xl font-semibold">
          {messages.account.login.title}
        </h1>
        <LoginForm next={next} />
      </main>
    </CampusEnergyProviders>
  );
}
