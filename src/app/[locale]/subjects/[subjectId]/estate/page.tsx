import { notFound, redirect } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { EstateGameClient } from "@/features/estate/components/estate-game-client";
import { getEstatePageData } from "@/features/estate/data/get-estate-page-data";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupPointPool,
  getPersonalPointTotal,
} from "@/features/account/data/account-dal";
import { EstateContributionChip } from "@/features/account/components/estate-contribution-chip";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type EstatePageProps = {
  params: Promise<{
    locale: string;
    subjectId: string;
  }>;
};

export default async function EstatePage({ params }: EstatePageProps) {
  const { locale, subjectId } = await params;

  if (!isLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const messages = await getMessages(locale);
  const data = await getEstatePageData(locale, subjectId, {
    getProfileGroupId: async () => profile.groupId,
    getGroupEarnedPoints: async (groupId) =>
      (await getGroupPointPool(groupId)).earnedPoints,
  });

  if (!data) notFound();

  const [personalPoints, groupPool] = await Promise.all([
    getPersonalPointTotal(profile.userId),
    getGroupPointPool(profile.groupId),
  ]);

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <EstateContributionChip
        personalPoints={personalPoints}
        groupPoolPoints={groupPool.earnedPoints}
      />
      <EstateGameClient data={data} />
    </CampusEnergyProviders>
  );
}
