import { notFound } from "next/navigation";
import { CampusEnergyApp } from "@/features/campus-energy/components/campus-energy-app";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return (
    <CampusEnergyApp
      locale={locale}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""}
      messages={messages}
    />
  );
}
