"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import type { SubjectContributorRankings } from "@/features/account/domain/contributor-ranking";
import type { SubjectAwardTiers } from "@/features/leagues/domain/types";
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
  subjectAwardTiers: SubjectAwardTiers;
  account: CampusEnergyAccount;
};

export function CampusEnergyApp({
  locale,
  mapboxToken,
  messages,
  contributorRankings,
  subjectAwardTiers,
  account,
}: CampusEnergyAppProps) {
  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <CampusEnergyShell
        mapboxToken={mapboxToken}
        contributorRankings={contributorRankings}
        subjectAwardTiers={subjectAwardTiers}
        account={account}
      />
    </CampusEnergyProviders>
  );
}

function CampusEnergyShell({
  mapboxToken,
  contributorRankings,
  subjectAwardTiers,
  account,
}: {
  mapboxToken: string;
  contributorRankings: SubjectContributorRankings;
  subjectAwardTiers: SubjectAwardTiers;
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
        subjectAwardTiers={subjectAwardTiers}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
      />
    </div>
  );
}
