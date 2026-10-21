import { useState } from "react";
import { usePreferences } from "../preferences";
import { gameDescriptionKeys, gameNameKeys } from "../lib/format";
import type { Avatar as AvatarId, GameMode } from "../types";
import { Brand } from "../components/Brand";
import { PreferencesBar } from "../components/PreferencesBar";
import { InstallButton } from "../components/InstallButton";
import { PlayingCard } from "../components/PlayingCard";
import { Avatar } from "../components/Avatar";
import { AvatarPicker } from "../components/AvatarPicker";
import { InstallNudge } from "../components/PWAUpdates";

const GAME_MODES: GameMode[] = ["poker", "tarneeb", "trix"];
const GAME_GLYPHS: Record<GameMode, string> = { poker: "♠", tarneeb: "♦", trix: "♥" };

type LobbyScreenProps = {
  gameMode: GameMode;
  name: string;
  avatar: AvatarId;
  tableName: string;
  joinCode: string;
  error: string;
  busy: boolean;
  onGameModeChange: (mode: GameMode) => void;
  onNameChange: (name: string) => void;
  onAvatarChange: (avatar: AvatarId) => void;
  onTableNameChange: (name: string) => void;
  onJoinCodeChange: (code: string) => void;
  onCreate: () => void;
  onJoin: () => void;
};

/** Landing page plus the host/join form. */
export function LobbyScreen({
  gameMode, name, avatar, tableName, joinCode, error, busy,
  onGameModeChange, onNameChange, onAvatarChange, onTableNameChange, onJoinCodeChange, onCreate, onJoin,
}: LobbyScreenProps) {
  const { t } = usePreferences();
  const [copied, setCopied] = useState(false);

  /** Share the club itself (not a table) — native sheet on phones, copy elsewhere. */
  async function shareApp() {
    const url = `${location.origin}${location.pathname}`;
    try {
      if (navigator.share) await navigator.share({ title: "After Hours", text: t("shareAppText"), url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    } catch { /* dismissed */ }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-note"><span className="live-dot" /> {t("rooms")}</div>
        <PreferencesBar />
        <InstallButton />
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{t("tableOpen")}</span>
          <h1>{t("goodCards")}<br /><em>{t("betterCompany")}</em></h1>
          <p>{t("heroDescription")}</p>
          <ul className="hero-meta">
            <li><i>✦</i> {t("pokerTarneebTrix")}</li>
            <li><i>⌁</i> {t("liveWithFriends")}</li>
            <li><i>◉</i> {t("justForFun")}</li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-glow" />
          <div className="art-card card-one"><PlayingCard card={{ rank: 14, suit: "♠" }} size="lg" /></div>
          <div className="art-card card-two"><PlayingCard card={{ rank: 13, suit: "♥" }} size="lg" /></div>
          <div className="art-chip chip-one" />
          <div className="art-chip chip-two" />
          <div className="art-friends">
            {(["fox", "owl", "panda", "tiger"] as const).map((id, i) => <Avatar key={id} id={id} expression={i === 1 ? "happy" : "idle"} />)}
          </div>
        </div>
      </section>

      <section className="lobby">
        <div className="lobby-intro">
          <span className="eyebrow">{t("makeYourMove")}</span>
          <h2>{t("findYourSeat")}</h2>
          <p>{t("lobbyDescription")}</p>
          <ol className="lobby-steps">
            <li>{t("stepShare")}</li>
            <li>{t("stepJoin")}</li>
            <li>{t("stepPlay")}</li>
          </ol>
        </div>

        <form className="panel lobby-card" onSubmit={(event) => { event.preventDefault(); onCreate(); }}>
          <div className="panel-head">
            <span className="eyebrow">{t("hostGame")}</span>
            <h3>{t("setTable")}</h3>
          </div>

          <span className="field-label" id="game-label">{t("chooseGame")}</span>
          <div className="game-options" role="radiogroup" aria-labelledby="game-label">
            {GAME_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={gameMode === mode}
                className={`game-option ${gameMode === mode ? "selected" : ""}`}
                onClick={() => onGameModeChange(mode)}
              >
                <span className="game-glyph" aria-hidden="true">{GAME_GLYPHS[mode]}</span>
                <strong>{t(gameNameKeys[mode])}</strong>
                <small>{t(gameDescriptionKeys[mode])}</small>
              </button>
            ))}
          </div>

          <AvatarPicker value={avatar} onChange={onAvatarChange} />

          <div className="field-pair">
            <label className="field-label">{t("yourName")}
              <input className="input" value={name} maxLength={18} autoComplete="nickname" onChange={(event) => onNameChange(event.target.value)} placeholder={t("yourNamePlaceholder")} />
            </label>
            <label className="field-label">{t("tableName")}
              <input className="input" value={tableName} maxLength={32} onChange={(event) => onTableNameChange(event.target.value)} placeholder={t("tableNamePlaceholder")} />
            </label>
          </div>
          <button type="submit" className="btn btn-gold btn-block" disabled={busy || !name.trim()}>{t("createTable")} <span aria-hidden="true">↗</span></button>

          <div className="or-divider"><span /> {t("or")} <span /></div>
          <div className="join-row">
            <input
              className="input code-input"
              aria-label={t("inviteCode")}
              value={joinCode}
              maxLength={6}
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (joinCode.length === 6 && name.trim()) onJoin(); } }}
              placeholder={t("inviteCodePlaceholder")}
            />
            <button type="button" className="btn btn-outline" disabled={busy || joinCode.length !== 6 || !name.trim()} onClick={onJoin}>{t("joinTable")} <span aria-hidden="true">→</span></button>
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="panel-foot">
            <span><i /> {t("noDownloads")}</span>
            <span><i /> {t("freePlay")}</span>
            <span><i /> {t("privateRooms")}</span>
          </div>
        </form>
      </section>

      <InstallNudge />
      <footer className="page-footer">
        <Brand compact />
        <span>{t("footerLine")} · © 2026 Loai Kanou</span>
        <button type="button" className="btn btn-ghost share-app" onClick={() => void shareApp()}>
          {copied ? t("linkCopied") : t("shareApp")} <span aria-hidden="true">↗</span>
        </button>
      </footer>
    </main>
  );
}
