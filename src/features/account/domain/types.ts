import type { AffiliationGroup } from "@/features/campus-energy/domain/types";

export type SchoolOption = {
  id: string;
  name: string;
  shortName: string;
};

export type GroupOption = {
  id: string;
  schoolId: string;
  name: string;
  type: AffiliationGroup["type"];
};

export type AccountProfile = {
  userId: string;
  displayName: string;
  schoolId: string;
  groupId: string;
};

export type ProfileDraft = {
  displayName: string;
  schoolId: string;
  groupId: string;
};

export type ProfileValidationError =
  | "display-name-required"
  | "display-name-too-long"
  | "school-required"
  | "group-required"
  | "group-school-mismatch";
