import { notFound, redirect } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { EstateShopClient } from "@/features/estate/components/estate-shop-client";
import { getEstatePageData } from "@/features/estate/data/get-estate-page-data";
import {
  getCurrentProfile,
  getCurrentUser,
  getGroupPointPool,
} from "@/features/account/data/account-dal";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type EstateShopPageProps = {
  params: Promise<{
    locale: string;
    subjectId: string;
  }>;
};

export default async function EstateShopPage({ params }: EstateShopPageProps) {
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

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <EstateShopClient data={data} />
    </CampusEnergyProviders>
  );
}
