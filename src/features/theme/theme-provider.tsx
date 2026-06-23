"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  defaultTheme,
  isThemeChoice,
  resolveTheme,
  THEME_COOKIE,
  type ResolvedTheme,
  type ThemeChoice,
} from "./theme";

type ThemeContextValue = {
  theme: ThemeChoice;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_EVENT = "cems-theme-change";
const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;

function readCookieTheme(): ThemeChoice {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]+)`),
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  return isThemeChoice(value) ? value : defaultTheme;
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Subscribe to the user's saved choice (changed via setTheme -> custom event).
function subscribeChoice(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

// Subscribe to anything that can change the resolved theme: the saved choice
// or the OS color-scheme (relevant when the choice is "system").
function subscribeResolved(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeChoice,
    readCookieTheme,
    () => defaultTheme,
  );

  const resolvedTheme = useSyncExternalStore(
    subscribeResolved,
    () => resolveTheme(readCookieTheme(), prefersDark()),
    () => "light" as ResolvedTheme,
  );

  // Keep <html data-theme> in sync with the resolved theme (external DOM sync,
  // not React state — safe inside an effect).
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${cookieMaxAgeSeconds}; samesite=lax`;
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
