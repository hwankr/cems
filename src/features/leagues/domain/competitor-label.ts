/**
 * Localize a league competitor (group) id. Group names are stored in English
 * in the DB; the localized labels live in i18n under `demo.groups`. Unknown
 * ids (e.g. future school-scope competitors) fall back to the raw RPC name.
 */
export function competitorLabel(
  groupLabels: Record<string, string>,
  competitorId: string,
  fallback: string,
): string {
  return groupLabels[competitorId] ?? fallback;
}
