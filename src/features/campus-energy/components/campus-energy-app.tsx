"use client";

import { useMemo, useState } from "react";
import { I18nProvider, useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import {
  demoSubjects,
  getDemoEnergyComparisons,
} from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";
import { AdminDashboard } from "./admin-dashboard";
import { LanguageSwitcher } from "./language-switcher";
import { ModeTabs } from "./mode-tabs";
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
    <I18nProvider locale={locale} messages={messages}>
      <CampusEnergyShell mapboxToken={mapboxToken} />
    </I18nProvider>
  );
}

function CampusEnergyShell({ mapboxToken }: { mapboxToken: string }) {
  const { messages } = useI18n();
  const [mode, setMode] = useState<Mode>("admin");
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    demoSubjects[0].id,
  );
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);
  const localizedDemo = useMemo(
    () => localizeDemoCampus(messages),
    [messages],
  );

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 p-4 text-slate-950">
      <header className="mb-4 flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            {messages.app.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {localizedDemo.school.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {messages.app.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ModeTabs mode={mode} onModeChange={setMode} />
          <LanguageSwitcher />
        </div>
      </header>
      {mode === "admin" ? (
        <AdminDashboard
          mapboxToken={mapboxToken}
          school={localizedDemo.school}
          subjects={localizedDemo.subjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
        />
      ) : (
        <ParticipantDashboard
          groups={localizedDemo.groups}
          participant={localizedDemo.participant}
        />
      )}
    </main>
  );
}
