import {
  demoSchool,
  getDemoEnergyComparisons,
} from "@/features/campus-energy/data/demo-campus";
import { localizeDemoCampus } from "@/features/campus-energy/data/localized-demo-campus";
import { calculatePoints } from "@/features/campus-energy/domain/scoring";
import type {
  EnergyComparison,
  EnergySubject,
  School,
} from "@/features/campus-energy/domain/types";
import { calculateEstatePointAccount } from "@/features/estate/domain/point-account";
import type {
  EstatePointAccount,
  EstateSnapshot,
} from "@/features/estate/domain/types";
import type { Locale } from "@/i18n/config";
import { enMessages } from "@/i18n/messages/en";
import { koMessages } from "@/i18n/messages/ko";
import type { Messages } from "@/i18n/messages/types";
import {
  createDemoEstateSeedSnapshot,
  demoHistoricalEarnedPointsBySubjectId,
} from "./demo-estate-data";

export type EstatePageSchool = Pick<School, "id" | "name" | "shortName">;

export type EstatePageSubject = Pick<
  EnergySubject,
  | "id"
  | "schoolId"
  | "campusId"
  | "type"
  | "name"
  | "shortName"
  | "officialCode"
>;

export type EstatePageData = {
  school: EstatePageSchool;
  subject: EstatePageSubject;
  comparison: EnergyComparison | null;
  pointAccount: EstatePointAccount;
  initialSnapshot: EstateSnapshot;
};

const messagesByLocale = {
  en: enMessages,
  ko: koMessages,
} satisfies Record<Locale, Messages>;

export function getEstatePageData(
  locale: Locale,
  subjectId: string,
): EstatePageData | null {
  const localizedDemo = localizeDemoCampus(locale, messagesByLocale[locale]);
  const subject = localizedDemo.subjects.find(
    (candidate) => candidate.id === subjectId,
  );

  if (!subject || subject.type !== "building") {
    return null;
  }

  const comparison =
    getDemoEnergyComparisons().find(
      (candidate) => candidate.subjectId === subjectId,
    ) ?? null;
  const currentPoints = comparison ? calculatePoints(comparison) : 0;
  const earnedPoints =
    currentPoints + (demoHistoricalEarnedPointsBySubjectId[subjectId] ?? 0);

  return {
    school: {
      id: demoSchool.id,
      name: localizedDemo.school.name,
      shortName: localizedDemo.school.shortName,
    },
    subject: {
      id: subject.id,
      schoolId: subject.schoolId,
      campusId: subject.campusId,
      type: subject.type,
      name: subject.name,
      shortName: subject.shortName,
      ...(subject.officialCode ? { officialCode: subject.officialCode } : {}),
    },
    comparison,
    pointAccount: calculateEstatePointAccount(earnedPoints, []),
    initialSnapshot: createDemoEstateSeedSnapshot(subjectId),
  };
}
