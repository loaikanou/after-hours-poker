import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePreferences } from "../preferences";
import { describeEvent } from "../i18n";
import { cardKey, contractKeys, formatNumber, gameTableKeys, isRed, maxPlayers, phaseKeys, seatLayout, towardSeat } from "../lib/format";
import { BET_REACH, useTableFx } from "../hooks/useTableFx";
import { useTableAttention } from "../hooks/useTableAttention";
import { tarneebMatchOver } from "../../convex/model/trick";
import type { ActionValues, Card, GameAction, PokerAction, TableSnapshot } from "../types";
import { Brand } from "../components/Brand";
import { PreferencesBar } from "../components/PreferencesBar";
import { InviteDialog } from "../components/InviteDialog";
import { PlayerSeat } from "../components/PlayerSeat";
import { PlayingCard } from "../components/PlayingCard";
import { TurnTimerBar } from "../components/TurnTimer";
import { TrickArea, TrixLayout } from "../components/TrickArea";
import { ChipFlights, Confetti } from "../components/Effects";
import { PokerControls } from "../components/PokerControls";
import { BiddingPanel, ContractPanel, HandFan, TrumpPanel } from "../components/TrickControls";
import { Scoreboard } from "../components/Scoreboard";

type GameTableProps = {
  table: TableSnapshot;
  error: string;
  busy: boolean;
  inviteUrl: string;
  inviteText: string;
  onLeave: () => void;
  onStart: () => void;
  onRebuy: () => void;
  onAction: (action: PokerAction | GameAction, values?: ActionValues) => void;
  onCopyLink: () => void;
  onShareLink: () => void;
};

const BETTING_PHASES = new Set(["preflop", "flop", "turn", "river"]);

/** The live table: felt, seats, effects, and the contextual action dock. */
export function GameTable({ table, error, busy, inviteUrl, inviteText, onLeave, onStart, onRebuy, onAction, onCopyLink, onShareLink }: GameTableProps) {
  const { locale, t } = usePreferences();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { players, game, phase } = table;
  const me = table.mySeat >= 0 ? players[table.mySeat] : undefined;
  const seats = useMemo(() => seatLayout(players.length, table.mySeat), [players.length, table.mySeat]);
  const { flights, land, celebration } = useTableFx(table, seats);

  const isTrick = game !== "poker";
  const showdown = phase === "showdown";
  const turnActive = table.turnIndex >= 0 && phase !== "waiting" && !showdown;
  const isMyTurn = turnActive && table.turnIndex === table.mySeat;
  const current = players[table.turnIndex];
  useTableAttention(me !== undefined, isMyTurn, t("yourTurn"));
  const cardsOut = game === "poker" ? BETTING_PHASES.has(phase) || showdown : phase === "trick";
  const minPlayers = game === "poker" ? 2 : 4;
  const layout = game === "trix" && table.contract === "trix";
  const timer = { startedAt: table.turnStartedAt, durationMs: table.turnDurationMs };
  const winnings = new Map(table.winners.map((w) => [w.seat, w.amount]));
  const highlight = useMemo(() => {
    const cards = table.winners.flatMap((w) => w.cards ?? []);
    return showdown && cards.length ? new Set(cards.map(cardKey)) : undefined;
  }, [showdown, table.winners]);

  function seatNote(seat: number): string | undefined {
    if (game === "tarneeb" && phase === "bidding") {
      const bid = table.bids[seat];
      return bid === undefined || bid < 0 ? undefined : bid === 0 ? t("passed") : t("bidLabel", { amount: formatNumber(bid, locale) });
    }
    if (isTrick && phase === "trick" && !layout) return t("tricksCount", { count: formatNumber(players[seat].tricksWon, locale) });
    return undefined;
  }

  function leave() {
    const inPlay = me && turnActive && !(game === "poker" && me.folded);
    if (!inPlay || window.confirm(t("leaveConfirm"))) onLeave();
  }

  const startLabel = game === "trix"
    ? t("startTrix")
    : game === "tarneeb"
      ? (table.handNumber === 0 || tarneebMatchOver(players.map((p) => p.score)) ? t("startTarneeb") : t("nextTarneebHand"))
      : table.handNumber === 0 ? t("dealHand") : t("dealNext");
  const canStart = game === "poker" ? players.filter((p) => p.chips > 0 && !p.left).length >= 2 : players.length === 4;

  const centerLabel = game === "poker"
    ? t("pot")
    : table.contract
        ? t(contractKeys[table.contract])
        : t(phaseKeys[phase]);

  let dock: ReactNode;
  if (phase === "waiting" || showdown) {
    const note = players.length < minPlayers
      ? (isTrick ? t("needFourPlayers", { count: formatNumber(minPlayers - players.length, locale) }) : t("needOneFriend"))
      : table.isHost ? t("tableReady") : t("waitingHost");
    dock = (
      <div className="dock-row">
        <p className="dock-note">{showdown ? describeEvent(table.event, t, locale) : note}</p>
        <div className="dock-actions">
          {game === "poker" && me && me.chips === 0 && <button type="button" className="btn btn-outline" disabled={busy} onClick={onRebuy}>{t("rebuy", { amount: formatNumber(1000, locale) })}</button>}
          {players.length < maxPlayers[game] && <button type="button" className="btn btn-outline" onClick={() => setInviteOpen(true)}>{t("inviteFriends")}</button>}
          {table.isHost && <button type="button" className="btn btn-gold" disabled={busy || !canStart} onClick={onStart}>{startLabel} <span aria-hidden="true">→</span></button>}
        </div>
      </div>
    );
  } else if (!me) {
    dock = <p className="dock-note">{t("spectator")}</p>;
  } else if (isMyTurn && game === "poker") {
    dock = <PokerControls table={table} me={me} busy={busy} onAction={onAction} />;
  } else if (isMyTurn && phase === "bidding") {
    dock = <BiddingPanel table={table} busy={busy} onAction={onAction} />;
  } else if (isMyTurn && phase === "trump") {
    dock = <TrumpPanel table={table} busy={busy} onAction={onAction} />;
  } else if (isMyTurn && phase === "contract") {
    dock = <ContractPanel table={table} busy={busy} onAction={onAction} />;
  } else if (isMyTurn && phase === "trick") {
    dock = <p className="dock-note your-turn">{t("playCardHint")}</p>;
  } else {
    dock = (
      <div className="dock-row">
        <p className="dock-note waiting"><span className="pulse-dot" aria-hidden="true" />{t("waitingTurn", { name: current?.name ?? "" })}</p>
        {game === "poker" && me.chips === 0 && me.folded && <button type="button" className="btn btn-outline" disabled={busy} onClick={onRebuy}>{t("rebuy", { amount: formatNumber(1000, locale) })}</button>}
      </div>
    );
  }

  return (
    <main className={`game-shell game-${game} ${isMyTurn ? "my-turn" : ""}`}>
      <header className="game-topbar">
        <Brand compact />
        <div className="table-title">
          <span className="eyebrow">{t(gameTableKeys[game])}</span>
          <h1>{table.name}</h1>
        </div>
        <button type="button" className="code-button" onClick={() => setInviteOpen(true)} aria-label={t("inviteFriends")}>
          <span aria-hidden="true">＋</span>{t("inviteFriends")}<code>{table.code}</code>
        </button>
        <PreferencesBar compact />
        <button type="button" className="btn btn-ghost leave-button" onClick={leave}>{t("leaveTable")} <span aria-hidden="true">↗</span></button>
      </header>

      {inviteOpen && <InviteDialog url={inviteUrl} text={inviteText} code={table.code} onClose={() => setInviteOpen(false)} onCopy={onCopyLink} onShare={onShareLink} />}

      <section className="table-stage" style={{ "--seats": players.length } as CSSProperties}>
        <div className={`felt ${isTrick && !layout && (table.trickCards.length > 0 || table.lastTrick) ? "has-trick" : ""}`}>
          <div className="felt-center">
            <div className="center-label">
              {centerLabel}
            </div>
            {game === "poker" && (
              <>
                {table.pot > 0 && <div className="pot-amount" key={table.pot}><i className="chip-dot" aria-hidden="true" />{formatNumber(table.pot, locale)}</div>}
                <div className="board">
                  {Array.from({ length: 5 }, (_, i) => {
                    const card: Card | undefined = table.board[i];
                    return card
                      ? <PlayingCard key={cardKey(card)} card={card} size="sm" className={`board-card ${highlight ? (highlight.has(cardKey(card)) ? "is-highlight" : "is-dim") : ""}`} style={{ "--i": i < 3 ? i : 0 } as CSSProperties} />
                      : <span key={`slot-${i}`} className="board-slot" />;
                  })}
                </div>
              </>
            )}
            {layout && <TrixLayout board={table.board} />}
            <p className={`ticker ${showdown ? "result" : ""} ${isMyTurn ? "your-turn" : ""}`} key={table.event.at} aria-live="polite">
              {isMyTurn && !showdown ? t("yourTurn") : describeEvent(table.event, t, locale)}
            </p>
          </div>

          {table.trump && <div className="felt-badge"><span>{t("trump")}</span><b className={isRed(table.trump) ? "red" : ""}>{table.trump}</b></div>}
          {isTrick && !layout && <TrickArea trickCards={table.trickCards} lastTrick={table.lastTrick} seats={seats} />}

          {game === "poker" && players.map((p, seat) => p.bet > 0 && seats[seat] && (
            <div key={`bet-${seat}`} className="bet-stack" style={{ left: `${towardSeat(seats[seat], BET_REACH).x}%`, top: `${towardSeat(seats[seat], BET_REACH).y}%` }}>
              <i className="chip-dot" aria-hidden="true" />{formatNumber(p.bet, locale)}
            </div>
          ))}

          {players.map((player, seat) => (
            <PlayerSeat
              key={seat}
              player={player}
              seat={seat}
              point={seats[seat]}
              game={game}
              inHand={cardsOut}
              active={turnActive && table.turnIndex === seat}
              dealer={game !== "trix" && table.dealerIndex === seat && table.handNumber > 0}
              winnings={game === "poker" ? winnings.get(seat) : undefined}
              highlight={game === "poker" && player.cards.length ? highlight : undefined}
              note={seatNote(seat)}
              team={game === "tarneeb" ? (seat % 2 as 0 | 1) : undefined}
              locale={locale}
              t={t}
              timer={turnActive && table.turnIndex === seat ? timer : undefined}
            />
          ))}

          <ChipFlights flights={flights} onLand={land} />
        </div>
      </section>

      {turnActive && <TurnTimerBar startedAt={timer.startedAt} durationMs={timer.durationMs} active mine={isMyTurn} />}
      {isTrick && table.handNumber > 0 && <Scoreboard table={table} />}
      {isTrick && me && me.cards.length > 0 && (
        <HandFan
          table={table}
          cards={me.cards}
          playable={isMyTurn && phase === "trick"}
          busy={busy}
          onPlay={(card) => onAction("play", { card })}
          onPass={() => onAction("pass")}
        />
      )}

      <section className={`action-dock ${isMyTurn ? "active" : ""}`}>
        {me && (
          <div className="dock-me">
            <span>{me.name}</span>
            <strong>{game === "poker" ? `${formatNumber(me.chips, locale)} ${t("chips")}` : `${formatNumber(me.score, locale)} · ${t("score")}`}</strong>
          </div>
        )}
        <div className="dock-main">{dock}</div>
      </section>

      <footer className="game-footer">
        <span role={error ? "alert" : undefined} className={error ? "footer-error" : ""}>{error || (game === "poker" ? t("playForFun") : game === "tarneeb" ? t("partnersAcross") : t("kingdomProgress", { done: formatNumber(Math.min(table.kingdomsCompleted + 1, 4), locale), total: formatNumber(4, locale) }))}</span>
        <span>
          {t("hand")} #{table.handNumber ? formatNumber(table.handNumber, locale) : "—"} · {t(phaseKeys[phase])} · {formatNumber(players.length, locale)}/{formatNumber(maxPlayers[game], locale)}
        </span>
      </footer>

      <Confetti burst={celebration} />
    </main>
  );
}
