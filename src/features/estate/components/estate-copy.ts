import type { Messages } from "@/i18n/messages/types";
import type { EstateItemDefinition } from "../domain/types";

export type EstateMessages = Messages["estate"];

export function getItemName(
  definition: EstateItemDefinition,
  copy: EstateMessages,
): string {
  return getRecordValue(copy.items, definition.id);
}

export function getParcelName(parcelId: string, copy: EstateMessages): string {
  return getRecordValue(copy.parcels, parcelId);
}

export function getRecordValue(
  record: Readonly<Record<string, string>>,
  key: string,
): string {
  return record[key] ?? key;
}

export function createEstateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `estate-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
