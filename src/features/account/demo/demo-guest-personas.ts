export const seededDemoGuestPersonas = [
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

export const singleDemoGuestPersona = {
  key: "complete-demo",
  icon: "building",
  accent: "grass",
} as const;

export const demoGuestPersonas = [
  ...seededDemoGuestPersonas,
  singleDemoGuestPersona,
] as const;

export type DemoGuestPersona = (typeof demoGuestPersonas)[number];
export type DemoGuestKey = DemoGuestPersona["key"];

const demoGuestKeys = new Set<string>(
  demoGuestPersonas.map((guest) => guest.key),
);

export function isDemoGuestKey(value: unknown): value is DemoGuestKey {
  return typeof value === "string" && demoGuestKeys.has(value);
}

export function getDemoGuestDisplayPersonas({
  singleAccount,
}: {
  singleAccount: boolean;
}): readonly DemoGuestPersona[] {
  return singleAccount ? [singleDemoGuestPersona] : seededDemoGuestPersonas;
}
