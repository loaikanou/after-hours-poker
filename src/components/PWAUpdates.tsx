import { useEffect, useState } from "react";
import { useConvexConnectionState } from "convex/react";
import { usePreferences } from "../preferences";
import { applyUpdate, dismissPwaToast, promptInstall, shouldNudgeInstall, snoozeInstallNudge, usePwa } from "../lib/pwa";
import { InstallSheet } from "./InstallSheet";
import { asset } from "../lib/paths";

/** Update-ready / offline-ready toast driven by the service worker. */
export function PWAUpdates() {
  const { t } = usePreferences();
  const { updateReady, offlineReady } = usePwa();
  if (!updateReady && !offlineReady) return null;
  return (
    <div className="pwa-toast" role="status">
      <span>{updateReady ? t("updateReady") : t("appOfflineReady")}</span>
      {updateReady && <button type="button" onClick={applyUpdate}>{t("update")}</button>}
      <button type="button" className="toast-dismiss" aria-label={t("dismiss")} onClick={dismissPwaToast}>×</button>
    </div>
  );
}

/** A gentle install suggestion for returning visitors, shown in the lobby only. */
export function InstallNudge() {
  const { t } = usePreferences();
  const pwa = usePwa();
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!shouldNudgeInstall(pwa)) { setVisible(false); return; }
    const id = window.setTimeout(() => setVisible(true), 4000);
    return () => window.clearTimeout(id);
  }, [pwa]);

  if (!visible && !sheetOpen) return null;
  const later = () => { snoozeInstallNudge(); setVisible(false); };
  return (
    <>
      {visible && (
        <div className="install-nudge" role="dialog" aria-labelledby="install-nudge-title">
          <img src={asset("icons/icon.svg")} alt="" width={44} height={44} />
          <div>
            <strong id="install-nudge-title">{t("installTitle")}</strong>
            <span>{t("installNudge")}</span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={later}>{t("notNow")}</button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => { setVisible(false); if (pwa.canPrompt) void promptInstall(); else setSheetOpen(true); }}
          >
            {t("installApp")}
          </button>
        </div>
      )}
      {sheetOpen && <InstallSheet onClose={() => { setSheetOpen(false); snoozeInstallNudge(); }} />}
    </>
  );
}

/** Shows when the browser is offline or the realtime connection to Convex dropped. */
export function ConnectionBanner() {
  const { t } = usePreferences();
  const connection = useConvexConnectionState();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const reconnecting = !connection.isWebSocketConnected;
  // Brief blips (first connect, tab switches, network hand-offs) shouldn't flash a banner.
  useEffect(() => {
    if (!reconnecting) { setGraceOver(false); return; }
    const id = window.setTimeout(() => setGraceOver(true), 2500);
    return () => window.clearTimeout(id);
  }, [reconnecting]);

  if (online && !(reconnecting && graceOver)) return null;
  return (
    <div className={`connection-banner ${online ? "" : "offline"}`} role="status">
      <span className="pulse-dot" aria-hidden="true" />
      {online && connection.hasEverConnected ? t("reconnecting") : t("offline")}
    </div>
  );
}
