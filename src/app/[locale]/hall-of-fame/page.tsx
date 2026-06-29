import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }> };

export default async function HallOfFameRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/leagues`);
}
