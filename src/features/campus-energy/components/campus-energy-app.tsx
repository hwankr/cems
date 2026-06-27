"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import { SignOutButton } from "@/features/account/components/sign-out-button";
import type { SubjectContributorRankings } from "@/features/account/domain/contributor-ranking";
import { getDemoEnergyComparisons } from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";
import { resolveInitialMainSubjectId } from "../domain/initial-subject";
import type { ParticipantProfile } from "../domain/types";
import { AdminMapView } from "./admin-map-view";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { CampusEnergyProviders } from "./campus-energy-providers";
import { ParticipantDashboard } from "./participant-dashboard";

type Mode = "admin" | "participant";

export type CampusEnergyAccount = {
  displayName: string;
  groupId: string;
  personalPoints: number;
  groupPoolPoints: number;
  groupMemberCount: number;
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
  const [mode, setMode] = useState<Mode>("admin");
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(locale, messages),
    [locale, messages],
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(() =>
    resolveInitialMainSubjectId(account.orgSubjectId, localizedDemo.subjects),
  );

  const participant: ParticipantProfile = {
    id: "me",
    displayName: account.displayName,
    schoolId: localizedDemo.school.id,
    groupId: account.groupId,
  };

  if (mode === "admin") {
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
          mode={mode}
          onModeChange={setMode}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <AppHeader
        mode={mode}
        onModeChange={setMode}
        schoolName={localizedDemo.school.name}
      />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink-muted">
            {account.displayName}
          </p>
          <SignOutButton />
        </div>
        <ParticipantDashboard
          groups={localizedDemo.groups}
          participant={participant}
          personalPoints={account.personalPoints}
          groupPoolPoints={account.groupPoolPoints}
          groupMemberCount={account.groupMemberCount}
        />
      </main>
      <BottomNav mode={mode} onModeChange={setMode} />
    </div>
  );
}
