import { useEffect, useRef } from "react";
import { usePreferences } from "../preferences";
import { promptInstall, usePwa } from "../lib/pwa";
import { asset } from "../lib/paths";

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

function AddGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" />
    </svg>
  );
}

/** Explains installing: the native prompt where the browser offers one, step-by-step instructions elsewhere. */
export function InstallSheet({ onClose }: { onClose: () => void }) {
  const { t } = usePreferences();
  const pwa = usePwa();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  useEffect(() => {
    if (pwa.installed) dialog.current?.close();
  }, [pwa.installed]);

  return (
    <dialog
      ref={dialog}
      className="modal install-sheet"
      aria-labelledby="install-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
    >
      <div className="modal-body">
        <button type="button" className="modal-close" aria-label={t("dismiss")} onClick={() => dialog.current?.close()}>×</button>
        <img className="install-icon" src={asset("icons/icon.svg")} alt="" width={84} height={84} />
        <h2 id="install-title">{t("installTitle")}</h2>
        <p>{t("installBody")}</p>
        <ul className="install-perks">
          <li>{t("installPerkFullscreen")}</li>
          <li>{t("installPerkBadge")}</li>
          <li>{t("installPerkFast")}</li>
        </ul>
        {pwa.canPrompt ? (
          <button type="button" className="btn btn-gold btn-block" onClick={() => void promptInstall()}>{t("installNow")}</button>
        ) : pwa.platform === "ios" ? (
          <ol className="install-steps">
            <li><span className="step-icon"><ShareGlyph /></span>{t("installStepShare")}</li>
            <li><span className="step-icon"><AddGlyph /></span>{t("installStepAdd")}</li>
            <li><span className="step-icon">✓</span>{t("installStepConfirm")}</li>
          </ol>
        ) : (
          <p className="notice">{t("installInstructionsOther")}</p>
        )}
      </div>
    </dialog>
  );
}
