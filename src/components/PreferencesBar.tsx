import { memo } from "react";
import { usePreferences } from "../preferences";
import { play } from "../lib/sound";

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" />
      {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="m17 9 5 6m0-6-5 6" />}
    </svg>
  );
}

/** Language, theme, and sound toggles shown in every top bar. */
export const PreferencesBar = memo(function PreferencesBar({ compact = false }: { compact?: boolean }) {
  const { locale, theme, sound, setLocale, setTheme, setSound, t } = usePreferences();
  return (
    <div className={`preferences-bar ${compact ? "compact" : ""}`} role="group" aria-label={t("displaySettings")}>
      <button
        type="button"
        className="icon-button"
        lang={locale === "en" ? "ar" : "en"}
        aria-label={locale === "en" ? "التبديل إلى العربية" : "Switch to English"}
        onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      >
        {compact ? (locale === "en" ? "ع" : "EN") : locale === "en" ? t("arabic") : t("english")}
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
        title={theme === "dark" ? t("lightMode") : t("darkMode")}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <span aria-hidden="true">{theme === "dark" ? "☼" : "☾"}</span>
      </button>
      <button
        type="button"
        className={`icon-button ${sound ? "" : "muted"}`}
        aria-pressed={sound}
        aria-label={sound ? t("soundOn") : t("soundOff")}
        title={sound ? t("soundOn") : t("soundOff")}
        onClick={() => { const next = !sound; setSound(next); if (next) setTimeout(() => play("select"), 0); }}
      >
        <SoundIcon on={sound} />
      </button>
    </div>
  );
});
