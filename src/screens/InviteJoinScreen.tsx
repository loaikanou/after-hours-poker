import { usePreferences } from "../preferences";
import { formatNumber, gameDescriptionKeys, gameNameKeys, maxPlayers } from "../lib/format";
import type { Avatar as AvatarId, TableSnapshot } from "../types";
import { Brand } from "../components/Brand";
import { PreferencesBar } from "../components/PreferencesBar";
import { Avatar } from "../components/Avatar";
import { AvatarPicker } from "../components/AvatarPicker";

type InviteJoinScreenProps = {
  table: TableSnapshot;
  name: string;
  avatar: AvatarId;
  error: string;
  busy: boolean;
  onNameChange: (name: string) => void;
  onAvatarChange: (avatar: AvatarId) => void;
  onJoin: () => void;
  onLeave: () => void;
};

/** Pre-seat screen for someone opening an invite link who has not joined yet. */
export function InviteJoinScreen({ table, name, avatar, error, busy, onNameChange, onAvatarChange, onJoin, onLeave }: InviteJoinScreenProps) {
  const { locale, t } = usePreferences();
  const { game, players } = table;
  const hasVacancy = game !== "poker" && players.some((p) => p.left);
  const full = players.length >= maxPlayers[game] && !hasVacancy;
  const locked = game !== "poker" && table.status === "playing" && !hasVacancy;

  return (
    <main className="page-shell invite-shell">
      <header className="topbar">
        <Brand />
        <PreferencesBar />
        <button type="button" className="btn btn-ghost" onClick={onLeave}>{t("backLobby")}</button>
      </header>
      <form className="panel invite-card" onSubmit={(event) => { event.preventDefault(); onJoin(); }}>
        <span className="eyebrow">{t("privateInvite")}</span>
        <h1>{table.name}</h1>
        <p>{t("inviteJoinDescription")}</p>
        <div className="invite-summary">
          <div className="invite-faces">{players.map((p, i) => <Avatar key={i} id={p.avatar} label={p.name} />)}</div>
          <div>
            <strong>{t(gameNameKeys[game])}</strong>
            <span>{t(gameDescriptionKeys[game])}</span>
            <span>{formatNumber(players.length, locale)} / {formatNumber(maxPlayers[game], locale)} {t("seats")}</span>
          </div>
        </div>
        <AvatarPicker value={avatar} onChange={onAvatarChange} />
        <label className="field-label">{t("yourName")}
          <input className="input" value={name} maxLength={18} autoComplete="nickname" onChange={(event) => onNameChange(event.target.value)} placeholder={t("yourNamePlaceholder")} />
        </label>
        {game === "poker" && table.status === "playing" && <p className="notice">{t("joinMidHand")}</p>}
        {(full || locked) && <p className="notice">{t(full ? "error_full" : "error_gameStarted")}</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-gold btn-block" disabled={busy || !name.trim() || full || locked}>{t("joinTable")} <span aria-hidden="true">→</span></button>
      </form>
    </main>
  );
}
