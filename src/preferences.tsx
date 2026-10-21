import { createContext, use } from "react";
import type { Locale, Theme, Translate } from "./i18n";

export type Preferences = {
  locale: Locale;
  theme: Theme;
  sound: boolean;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setSound: (sound: boolean) => void;
  t: Translate;
};

export const PreferencesContext = createContext<Preferences | null>(null);

export function usePreferences(): Preferences {
  const value = use(PreferencesContext);
  if (!value) throw new Error("Preferences are unavailable");
  return value;
}
