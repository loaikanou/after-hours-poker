import React from "react";
import { usePreferences } from "../preferences";
import { Brand } from "../components/Brand";
import { PreferencesBar } from "../components/PreferencesBar";
import { asset } from "../lib/paths";

/** Placeholder shown while the first table snapshot is in flight. */
export function LoadingScreen() {
  const { t } = usePreferences();
  return (
    <div className="loading-screen">
      <img className="brand-mark" src={asset("favicon.svg")} alt="" width={60} height={60} />
      <span className="eyebrow">AFTER HOURS</span>
      <p>{t("loadingTable")}</p>
    </div>
  );
}

/** Shown when the invite code resolves to no table. */
export function NotFoundScreen({ onLeave }: { onLeave: () => void }) {
  const { t } = usePreferences();
  return (
    <main className="page-shell">
      <header className="topbar"><Brand /><PreferencesBar /><button className="quiet-button" onClick={onLeave}>{t("backLobby")}</button></header>
      <section className="empty-state">
        <span className="eyebrow">{t("tableNotFound")}</span>
        <h1>{t("inviteExpired")}</h1>
        <p>{t("checkInvite")}</p>
        <button className="gold-button" onClick={onLeave}>{t("returnLobby")} <span>↗</span></button>
      </section>
    </main>
  );
}
