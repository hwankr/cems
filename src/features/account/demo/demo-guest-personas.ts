export const representativeDemoGuestPersona = {
  key: "complete-demo",
  icon: "building",
  accent: "grass",
} as const;

export const demoGuestPersonas = [representativeDemoGuestPersona] as const;

export type DemoGuestPersona = (typeof demoGuestPersonas)[number];
export type DemoGuestKey = DemoGuestPersona["key"];

const demoGuestKeys = new Set<string>(
  demoGuestPersonas.map((guest) => guest.key),
);

export function isDemoGuestKey(value: unknown): value is DemoGuestKey {
  return typeof value === "string" && demoGuestKeys.has(value);
}

export function getDemoGuestDisplayPersonas(): readonly DemoGuestPersona[] {
  return demoGuestPersonas;
}
