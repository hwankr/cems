export const demoGuestPersonas = [
  {
    key: "engineering-leader",
    icon: "trophy",
    accent: "green",
  },
  {
    key: "humanities-leader",
    icon: "sparkles",
    accent: "honey",
  },
  {
    key: "estate-builder",
    icon: "building",
    accent: "grass",
  },
] as const;

export type DemoGuestPersona = (typeof demoGuestPersonas)[number];
export type DemoGuestKey = DemoGuestPersona["key"];

const demoGuestKeys = new Set<string>(
  demoGuestPersonas.map((guest) => guest.key),
);

export function isDemoGuestKey(value: unknown): value is DemoGuestKey {
  return typeof value === "string" && demoGuestKeys.has(value);
}
