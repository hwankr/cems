import { compareEnergy } from "../domain/energy";
import { rankSubjects } from "../domain/scoring";
import type {
  AffiliationGroup,
  EnergyReading,
  ParticipantProfile,
  School,
} from "../domain/types";
import {
  yeungnamBuildingSubjects,
  type YeungnamBuildingSubject,
} from "./yeungnam-buildings";

export type DemoEnergySubject = YeungnamBuildingSubject;

export const demoSchool: School = {
  id: "yeungnam",
  name: "Yeungnam University",
  shortName: "YU",
  center: [128.757416, 35.83287],
  zoom: 15.4,
  pitch: 60,
};

export const demoGroups: AffiliationGroup[] = [
  {
    id: "engineering",
    schoolId: "yeungnam",
    name: "College of Engineering",
    type: "college",
  },
  {
    id: "humanities",
    schoolId: "yeungnam",
    name: "College of Humanities",
    type: "college",
  },
  {
    id: "student-services",
    schoolId: "yeungnam",
    name: "Student Services",
    type: "other",
  },
];

export const demoParticipant: ParticipantProfile = {
  id: "demo-user",
  displayName: "Demo Student",
  schoolId: "yeungnam",
  groupId: "engineering",
};

export const demoGroupIdsByOfficialCode: ReadonlyMap<string, string> = new Map([
  ["E21", "engineering"],
  ["E22", "engineering"],
  ["E23", "engineering"],
  ["E24", "engineering"],
  ["C02", "humanities"],
  ["B04", "student-services"],
]);

export const demoSubjects: DemoEnergySubject[] = yeungnamBuildingSubjects.map(
  (subject) => {
    const groupId = subject.officialCode
      ? demoGroupIdsByOfficialCode.get(subject.officialCode)
      : undefined;

    return groupId ? { ...subject, groupId } : subject;
  },
);

export const demoEnergyReadings: EnergyReading[] = [
  {
    subjectId: "yu-e21",
    actualKwh: 1360,
    forecastKwh: 1500,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-e22",
    actualKwh: 1710,
    forecastKwh: 1600,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-c02",
    actualKwh: 980,
    forecastKwh: 1120,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-b04",
    actualKwh: 2140,
    forecastKwh: 2050,
    periodLabel: "2026-W25",
  },
];

export const demoDefaultSubjectId =
  demoEnergyReadings[0]?.subjectId ??
  demoSubjects.find(
    (subject) =>
      Boolean(subject.geometry) ||
      (typeof subject.lng === "number" && typeof subject.lat === "number"),
  )?.id ??
  demoSubjects[0]?.id ??
  "";

export function getDemoEnergyComparisons() {
  return demoEnergyReadings.map(compareEnergy);
}

export function getDemoGroupRankings() {
  const comparisons = getDemoEnergyComparisons();
  const groupComparisons = demoGroups.map((group) => {
    const subjectIds = demoSubjects
      .filter((subject) => subject.groupId === group.id)
      .map((subject) => subject.id);
    const subjectIdSet = new Set(subjectIds);
    const actualKwh = comparisons
      .filter((comparison) => subjectIdSet.has(comparison.subjectId))
      .reduce((sum, comparison) => sum + comparison.actualKwh, 0);
    const forecastKwh = comparisons
      .filter((comparison) => subjectIdSet.has(comparison.subjectId))
      .reduce((sum, comparison) => sum + comparison.forecastKwh, 0);

    return compareEnergy({
      subjectId: group.id,
      actualKwh,
      forecastKwh,
      periodLabel: "2026-W25",
    });
  });

  return rankSubjects(groupComparisons);
}
