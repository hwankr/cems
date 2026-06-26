import { isLocale } from "@/i18n/config";

// Returns the path only if it is a safe, same-site, locale-prefixed path.
// Rejects absolute URLs, protocol-relative ("//evil"), and backslash tricks
// so a forged ?next= cannot become an open redirect.
export function isSafeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  const firstSegment = value.split("/")[1];
  if (!isLocale(firstSegment)) return null;
  return value;
}
