import { compareEnergy } from "../domain/energy";
import { rankSubjects } from "../domain/scoring";
import type {
  AffiliationGroup,
  EnergyReading,
  EnergySubject,
  ParticipantProfile,
  School,
} from "../domain/types";

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

export const demoSubjects: EnergySubject[] = [
  {
    id: "yu-it",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "IT Building",
    shortName: "IT",
    lng: 128.75859,
    lat: 35.83393,
    groupId: "engineering",
  },
  {
    id: "yu-mechanical",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Mechanical Engineering Building",
    shortName: "ME",
    lng: 128.75663,
    lat: 35.83437,
    groupId: "engineering",
  },
  {
    id: "yu-humanities",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "Humanities Building",
    shortName: "HM",
    lng: 128.75921,
    lat: 35.83172,
    groupId: "humanities",
  },
  {
    id: "yu-library",
    schoolId: "yeungnam",
    campusId: "gyeongsan",
    type: "building",
    name: "University Library",
    shortName: "LIB",
    lng: 128.757416,
    lat: 35.83287,
    groupId: "student-services",
  },
];

export const demoEnergyReadings: EnergyReading[] = [
  {
    subjectId: "yu-it",
    actualKwh: 1360,
    forecastKwh: 1500,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-mechanical",
    actualKwh: 1710,
    forecastKwh: 1600,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-humanities",
    actualKwh: 980,
    forecastKwh: 1120,
    periodLabel: "2026-W25",
  },
  {
    subjectId: "yu-library",
    actualKwh: 2140,
    forecastKwh: 2050,
    periodLabel: "2026-W25",
  },
];

export function getDemoEnergyComparisons() {
  return demoEnergyReadings.map(compareEnergy);
}

export function getDemoGroupRankings() {
  const comparisons = getDemoEnergyComparisons();
  const groupComparisons = demoGroups.map((group) => {
    const subjectIds = demoSubjects
      .filter((subject) => subject.groupId === group.id)
      .map((subject) => subject.id);
    const actualKwh = comparisons
      .filter((comparison) => subjectIds.includes(comparison.subjectId))
      .reduce((sum, comparison) => sum + comparison.actualKwh, 0);
    const forecastKwh = comparisons
      .filter((comparison) => subjectIds.includes(comparison.subjectId))
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
