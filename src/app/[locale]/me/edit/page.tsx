import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { ProfileEditForm } from "@/features/account/components/profile-edit-form";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type EditPageProps = { params: Promise<{ locale: string }> };

export default async function ProfileEditPage({ params }: EditPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/me/edit`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const messages = await getMessages(locale);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}/me`} className="text-sm font-medium text-ink-muted">
            ← {messages.me.title}
          </Link>
          <h1 className="text-sm font-semibold text-ink">{messages.me.edit.title}</h1>
        </header>
        <ProfileEditForm
          displayName={profile.displayName}
          handle={profile.handle}
          bio={profile.bio}
        />
      </main>
    </CampusEnergyProviders>
  );
}
