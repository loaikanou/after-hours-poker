import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { translator, type Locale, type Theme } from "./i18n";
import { convex, readStorage, writeStorage } from "./lib/session";
import { setSoundEnabled, unlockAudioOnGesture } from "./lib/sound";
import { registerServiceWorker } from "./lib/pwa";
import { PreferencesContext, type Preferences } from "./preferences";
import { App } from "./App";
import { SetupScreen } from "./components/SetupScreen";
import { PWAUpdates } from "./components/PWAUpdates";
import "./styles.css";

function initialTheme(): Theme {
  const stored = readStorage("after-hours-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** `?lang=ar` / `?lang=en` (the hreflang targets) win over the saved choice. */
function initialLocale(): Locale {
  const requested = new URLSearchParams(location.search).get("lang") ?? readStorage("after-hours-locale");
  return requested === "ar" ? "ar" : "en";
}

/** Resolves language/theme/sound preferences, then mounts the app against Convex. */
function Root() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [sound, setSound] = useState(() => readStorage("after-hours-sound") !== "off");
  const preferences = useMemo<Preferences>(
    () => ({ locale, theme, sound, setLocale, setTheme, setSound, t: translator(locale) }),
    [locale, theme, sound],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    root.dataset.theme = theme;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute("content", theme === "light" ? "#f4f1e8" : "#0b1410");
    writeStorage("after-hours-locale", locale);
    writeStorage("after-hours-theme", theme);
  }, [locale, theme]);

  useEffect(() => {
    setSoundEnabled(sound);
    writeStorage("after-hours-sound", sound ? "on" : "off");
  }, [sound]);

  return (
    <PreferencesContext value={preferences}>
      {convex ? <ConvexProvider client={convex}><App /></ConvexProvider> : <SetupScreen />}
      <PWAUpdates />
    </PreferencesContext>
  );
}

registerServiceWorker();
unlockAudioOnGesture();
createRoot(document.getElementById("root")!).render(<StrictMode><Root /></StrictMode>);
