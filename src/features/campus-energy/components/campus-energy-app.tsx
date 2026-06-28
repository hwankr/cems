"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import type { SubjectContributorRankings } from "@/features/account/domain/contributor-ranking";
import { getDemoEnergyComparisons } from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";
import { resolveInitialMainSubjectId } from "../domain/initial-subject";
import { AdminMapView } from "./admin-map-view";
import { CampusEnergyProviders } from "./campus-energy-providers";

export type CampusEnergyAccount = {
  orgSubjectId: string | null;
};

type CampusEnergyAppProps = {
  locale: Locale;
  mapboxToken: string;
  messages: Messages;
  contributorRankings: SubjectContributorRankings;
  account: CampusEnergyAccount;
};

export function CampusEnergyApp({
  locale,
  mapboxToken,
  messages,
  contributorRankings,
  account,
}: CampusEnergyAppProps) {
  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <CampusEnergyShell
        mapboxToken={mapboxToken}
        contributorRankings={contributorRankings}
        account={account}
      />
    </CampusEnergyProviders>
  );
}

function CampusEnergyShell({
  mapboxToken,
  contributorRankings,
  account,
}: {
  mapboxToken: string;
  contributorRankings: SubjectContributorRankings;
  account: CampusEnergyAccount;
}) {
  const { locale, messages } = useI18n();
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(locale, messages),
    [locale, messages],
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(() =>
    resolveInitialMainSubjectId(account.orgSubjectId, localizedDemo.subjects),
  );

  return (
    <div className="fixed inset-0 bg-canvas text-ink">
      <AdminMapView
        mapboxToken={mapboxToken}
        orgSubjectId={account.orgSubjectId}
        school={localizedDemo.school}
        subjects={localizedDemo.subjects}
        comparisons={comparisons}
        contributorRankings={contributorRankings}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
      />
    </div>
  );
}
