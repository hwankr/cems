"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import {
  demoDefaultSubjectId,
  getDemoEnergyComparisons,
} from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";
import { AdminMapView } from "./admin-map-view";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { CampusEnergyProviders } from "./campus-energy-providers";
import { ParticipantDashboard } from "./participant-dashboard";

type Mode = "admin" | "participant";

type CampusEnergyAppProps = {
  locale: Locale;
  mapboxToken: string;
  messages: Messages;
};

export function CampusEnergyApp({
  locale,
  mapboxToken,
  messages,
}: CampusEnergyAppProps) {
  return (
    <CampusEnergyProviders locale={locale} messages={messages}>
      <CampusEnergyShell mapboxToken={mapboxToken} />
    </CampusEnergyProviders>
  );
}

function CampusEnergyShell({ mapboxToken }: { mapboxToken: string }) {
  const { locale, messages } = useI18n();
  const [mode, setMode] = useState<Mode>("admin");
  const [selectedSubjectId, setSelectedSubjectId] =
    useState(demoDefaultSubjectId);
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(locale, messages),
    [locale, messages],
  );

  if (mode === "admin") {
    return (
      <div className="fixed inset-0 bg-canvas text-ink">
        <AdminMapView
          mapboxToken={mapboxToken}
          school={localizedDemo.school}
          subjects={localizedDemo.subjects}
          comparisons={comparisons}
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
        <ParticipantDashboard
          groups={localizedDemo.groups}
          participant={localizedDemo.participant}
        />
      </main>
      <BottomNav mode={mode} onModeChange={setMode} />
    </div>
  );
}
