"use client";

import { useMemo, useState } from "react";
import {
  demoSchool,
  demoSubjects,
  getDemoEnergyComparisons,
} from "../data/demo-campus";
import { AdminDashboard } from "./admin-dashboard";
import { ModeTabs } from "./mode-tabs";
import { ParticipantDashboard } from "./participant-dashboard";

type Mode = "admin" | "participant";

type CampusEnergyAppProps = {
  mapboxToken: string;
};

export function CampusEnergyApp({ mapboxToken }: CampusEnergyAppProps) {
  const [mode, setMode] = useState<Mode>("admin");
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    demoSubjects[0].id,
  );
  const comparisons = useMemo(() => getDemoEnergyComparisons(), []);

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 p-4 text-slate-950">
      <header className="mb-4 flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            Campus Energy Management System
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{demoSchool.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Actual electricity usage compared with forecast baseline.
          </p>
        </div>
        <ModeTabs mode={mode} onModeChange={setMode} />
      </header>
      {mode === "admin" ? (
        <AdminDashboard
          mapboxToken={mapboxToken}
          school={demoSchool}
          subjects={demoSubjects}
          comparisons={comparisons}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
        />
      ) : (
        <ParticipantDashboard />
      )}
    </main>
  );
}
