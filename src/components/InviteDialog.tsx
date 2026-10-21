import { useEffect, useRef, useState } from "react";
import { usePreferences } from "../preferences";

type InviteDialogProps = { url: string; text: string; code: string; onClose: () => void; onCopy: () => void; onShare: () => void };

const ICON = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true, fill: "currentColor" } as const;

/** One-tap invites for the apps friends actually use; each opens a prefilled message. */
function shareTargets(url: string, text: string) {
  const message = encodeURIComponent(`${text}\n${url}`);
  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${message}`,
      icon: <svg {...ICON}><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2Z" /></svg>,
    },
    {
      id: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      icon: <svg {...ICON}><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3Z" /></svg>,
    },
    {
      id: "email",
      label: "",
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${message}`,
      icon: <svg {...ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
    },
  ];
}

/** Native <dialog> with a lazily generated QR code plus copy/share actions. */
export function InviteDialog({ url, text, code, onClose, onCopy, onShare }: InviteDialogProps) {
  const { t } = usePreferences();
  const dialog = useRef<HTMLDialogElement>(null);
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    let active = true;
    import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 260, color: { dark: "#17251c", light: "#ffffff" } }))
      .then((data) => { if (active) setQrData(data); })
      .catch(() => { if (active) setQrData(""); });
    return () => { active = false; };
  }, [url]);

  return (
    <dialog
      ref={dialog}
      className="modal invite-modal"
      aria-labelledby="invite-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
    >
      <div className="modal-body">
        <button type="button" className="modal-close" aria-label={t("dismiss")} onClick={() => dialog.current?.close()}>×</button>
        <span className="eyebrow">{t("privateInvite")}</span>
        <h2 id="invite-title">{t("inviteFriends")}</h2>
        <p>{t("scanToJoin")}</p>
        <div className="qr-frame">{qrData ? <img src={qrData} alt={t("qrAlt")} width={220} height={220} /> : <span>{t("loadingQr")}</span>}</div>
        <div className="invite-code" dir="ltr">{code.split("").map((char, i) => <span key={i}>{char}</span>)}</div>
        <label className="field-label">{t("inviteLink")}
          <input className="input" readOnly value={url} dir="ltr" onFocus={(event) => event.currentTarget.select()} />
        </label>
        <p className="share-label">{t("shareVia")}</p>
        <div className="share-targets">
          {shareTargets(url, text).map((target) => (
            <a key={target.id} className={`share-chip share-${target.id}`} href={target.href} target="_blank" rel="noopener noreferrer">
              {target.icon}{target.label || t("shareEmail")}
            </a>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onCopy}>{t("copyLink")}</button>
          <button type="button" className="btn btn-gold" onClick={onShare}>{t("shareLink")} <span aria-hidden="true">↗</span></button>
        </div>
      </div>
    </dialog>
  );
}
