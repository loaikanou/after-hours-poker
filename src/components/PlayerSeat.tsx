import { memo } from "react";
import type { Locale, Translate } from "../i18n";
import { cardKey, formatNumber } from "../lib/format";
import type { GameMode, SeatPoint, VisiblePlayer } from "../types";
import { Avatar, type Expression } from "./Avatar";
import { PlayingCard } from "./PlayingCard";
import { TurnTimerRing } from "./TurnTimer";

type PlayerSeatProps = {
  player: VisiblePlayer;
  seat: number;
  point: SeatPoint;
  game: GameMode;
  /** True while cards are out (between the deal and the end of the hand). */
  inHand: boolean;
  active: boolean;
  dealer: boolean;
  /** Chips won this hand, shown as a floating "+N". */
  winnings?: number;
  /** Cards from the winning five to emphasise at showdown. */
  highlight?: Set<string>;
  /** Short status chip under the name: a bid, "pass", tricks taken… */
  note?: string;
  team?: 0 | 1;
  locale: Locale;
  t: Translate;
  /** Present only for the seat that is currently on the clock. */
  timer?: { startedAt: number; durationMs: number };
};

function expressionFor(player: VisiblePlayer, active: boolean, inHand: boolean, winnings: number | undefined): Expression {
  if (player.left) return "away";
  if (winnings) return "happy";
  if (player.folded && inHand) return "sad";
  if (inHand && player.chips === 0 && player.bet > 0) return "shocked";
  if (active) return "thinking";
  return "idle";
}

export const PlayerSeat = memo(function PlayerSeat({
  player, seat, point, game, inHand, active, dealer, winnings, highlight, note, team, locale, t, timer,
}: PlayerSeatProps) {
  const expression = expressionFor(player, active, inHand, winnings);
  const sittingOut = game === "poker" && inHand && player.folded && player.cardsRemaining === 0;
  const allIn = game === "poker" && inHand && !player.folded && player.chips === 0;
  const badge = player.left ? t("away") : sittingOut ? t("sittingOut") : player.folded && inHand ? t("folded") : allIn ? t("allIn") : null;
  const classes = [
    "seat",
    player.isYou && "is-you",
    active && "is-active",
    player.folded && inHand && "is-folded",
    player.left && "is-away",
    winnings && "is-winner",
    team !== undefined && `team-${team}`,
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} style={{ left: `${point.x}%`, top: `${point.y}%`, ["--blink" as string]: `${(seat * 1.7) % 5}s` }}>
      {game === "poker" && (player.cards.length > 0 || (inHand && !player.folded)) && (
        <div className={`hole-cards ${player.isYou ? "mine" : ""}`} style={{ ["--deal-delay" as string]: `${seat * 70}ms` }}>
          {player.cards.length
            ? player.cards.map((card) => (
                <PlayingCard
                  key={cardKey(card)}
                  card={card}
                  size={player.isYou ? "md" : "sm"}
                  className={highlight ? (highlight.has(cardKey(card)) ? "is-highlight" : "is-dim") : player.isYou ? "" : "is-revealed"}
                />
              ))
            : <><PlayingCard faceDown size="sm" /><PlayingCard faceDown size="sm" /></>}
        </div>
      )}

      <div className="seat-portrait">
        <Avatar id={player.avatar} expression={expression} />
        {timer && <TurnTimerRing startedAt={timer.startedAt} durationMs={timer.durationMs} active />}
        {dealer && <span className="dealer-chip" aria-label="Dealer">D</span>}
        {player.isHost && <span className="host-crown" aria-label={t("host")}>♛</span>}
      </div>

      <div className="seat-plate">
        <span className="seat-name">{player.name}{player.isYou && <em> · {t("you")}</em>}</span>
        <span className="seat-meta">
          {game === "poker"
            ? <><i className="chip-dot" aria-hidden="true" />{formatNumber(player.chips, locale)}</>
            : <>{formatNumber(player.score, locale)} <small>· {formatNumber(player.cardsRemaining, locale)} {t("cards")}</small></>}
        </span>
      </div>

      {(badge || note) && <span className={`seat-badge ${badge ? "status" : ""}`}>{badge ?? note}</span>}
      {winnings ? <span className="win-pop" key={winnings}>+{formatNumber(winnings, locale)}</span> : null}
    </div>
  );
});
