import React from "react";
import { usePreferences } from "../preferences";
import { Brand } from "./Brand";
import { PreferencesBar } from "./PreferencesBar";

/** Shown when `VITE_CONVEX_URL` is missing so the table has no backend to talk to. */
export function SetupScreen() {
  const { t } = usePreferences();
  return (
    <main className="setup-screen">
      <div className="setup-top"><Brand /><PreferencesBar /></div>
      <div className="setup-card">
        <span className="eyebrow">{t("setupEyebrow")}</span>
        <h1>{t("setupTitle")}</h1>
        <p>{t("setupDescription")}</p>
        <code>npm run dev</code>
        <p className="setup-small">{t("setupHint")} <b>.env.local</b> {t("setupHintEnd")}</p>
      </div>
    </main>
  );
}
