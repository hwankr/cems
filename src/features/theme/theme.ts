export const THEME_COOKIE = "cems-theme";

export const themeChoices = ["light", "dark", "system"] as const;

export type ThemeChoice = (typeof themeChoices)[number];

export type ResolvedTheme = "light" | "dark";

export const defaultTheme: ThemeChoice = "light";

export function isThemeChoice(value: string | null | undefined): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

// Runs before paint (injected inline in the layout) to set the initial
// data-theme from the saved cookie / OS preference and avoid a theme flash.
export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);var c=m?decodeURIComponent(m[1]):null;var t=c==='dark'||c==='light'?c:(c==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'${defaultTheme}');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='${defaultTheme}';}})();`;
