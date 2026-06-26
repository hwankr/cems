import { notFound, redirect } from "next/navigation";
import { CampusEnergyApp } from "@/features/campus-energy/components/campus-energy-app";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupEstateSubjectId,
  getGroupPointPool,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const [messages, personalPoints, groupPool, orgSubjectId] =
    await Promise.all([
      getMessages(locale),
      getPersonalPointTotal(profile.userId),
      getGroupPointPool(profile.groupId),
      getGroupEstateSubjectId(profile.groupId),
    ]);

  return (
    <CampusEnergyApp
      locale={locale}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
      messages={messages}
      account={{
        displayName: profile.displayName,
        groupId: profile.groupId,
        personalPoints,
        groupPoolPoints: groupPool.earnedPoints,
        groupMemberCount: groupPool.memberCount,
        orgSubjectId,
      }}
    />
  );
}
