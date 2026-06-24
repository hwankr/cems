import { notFound } from "next/navigation";
import { CampusEnergyProviders } from "@/features/campus-energy/components/campus-energy-providers";
import { EstateGameClient } from "@/features/estate/components/estate-game-client";
import { getEstatePageData } from "@/features/estate/data/get-estate-page-data";
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

  const messages = await getMessages(locale);
  const data = getEstatePageData(locale, subjectId);

  if (!data) notFound();

  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <EstateGameClient data={data} />
    </CampusEnergyProviders>
  );
}
