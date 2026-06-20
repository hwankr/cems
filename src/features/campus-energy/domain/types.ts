export type EnergySubjectType =
  | "building"
  | "department"
  | "college"
  | "school"
  | "region";

export type EnergyStatus = "saving" | "neutral" | "overuse";

export type EnergySubject = {
  id: string;
  schoolId: string;
  campusId: string;
  type: EnergySubjectType;
  name: string;
  shortName: string;
  lng: number;
  lat: number;
  groupId?: string;
};

export type EnergyReading = {
  subjectId: string;
  actualKwh: number;
  forecastKwh: number;
  periodLabel: string;
};

export type EnergyComparison = EnergyReading & {
  deltaKwh: number;
  savingsKwh: number;
  overuseKwh: number;
  savingsRate: number;
  status: EnergyStatus;
};

export type EnergySummary = {
  actualKwh: number;
  forecastKwh: number;
  savingsKwh: number;
  overuseKwh: number;
  netDeltaKwh: number;
  netSavingsRate: number;
};

export type RankedEnergySubject = EnergyComparison & {
  rank: number;
  points: number;
};

export type CharacterProgress = {
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progressRate: number;
  title: string;
};

export type School = {
  id: string;
  name: string;
  shortName: string;
  center: [number, number];
  zoom: number;
  pitch: number;
};

export type AffiliationGroup = {
  id: string;
  schoolId: string;
  name: string;
  type: "college" | "department" | "dormitory" | "staff" | "other";
};

export type ParticipantProfile = {
  id: string;
  displayName: string;
  schoolId: string;
  groupId: string;
};
