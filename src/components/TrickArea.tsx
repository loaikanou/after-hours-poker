import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { cardKey, isRed, rankName, towardSeat } from "../lib/format";
import { SUITS } from "../../convex/model/types";
import type { Card, SeatPoint, TableSnapshot } from "../types";
import { PlayingCard } from "./PlayingCard";

const HOLD_MS = 900;
const SWEEP_MS = 520;

type TrickAreaProps = { trickCards: TableSnapshot["trickCards"]; lastTrick: TableSnapshot["lastTrick"]; seats: SeatPoint[] };

/**
 * The cards in the middle of a trick. Each card flies in from its player's
 * seat; when a trick completes the server clears it immediately, so the last
 * trick is held on screen briefly and then swept toward the winner.
 */
export const TrickArea = memo(function TrickArea({ trickCards, lastTrick, seats }: TrickAreaProps) {
  const lastKey = lastTrick ? lastTrick.cards.map((entry) => cardKey(entry.card)).join("|") : "";
  const seenKey = useRef(lastKey);
  const [held, setHeld] = useState<{ key: string; sweeping: boolean } | null>(null);

  useEffect(() => {
    if (!lastKey || lastKey === seenKey.current) return;
    seenKey.current = lastKey;
    setHeld({ key: lastKey, sweeping: false });
    const sweep = window.setTimeout(() => setHeld({ key: lastKey, sweeping: true }), HOLD_MS);
    const clear = window.setTimeout(() => setHeld(null), HOLD_MS + SWEEP_MS);
    return () => { window.clearTimeout(sweep); window.clearTimeout(clear); };
  }, [lastKey]);

  const holding = held !== null && held.key === lastKey && lastTrick !== null && trickCards.length === 0;
  const shown = holding ? lastTrick.cards : trickCards;
  const winnerSeat = holding ? seats[lastTrick.winner] : undefined;

  return (
    <div className="trick-area" aria-live="polite">
      {shown.map((entry) => {
        const from = seats[entry.playerIndex] ?? { x: 50, y: 100 };
        const spot = towardSeat(from, 0.34);
        const style = {
          left: `${spot.x}%`,
          top: `${spot.y}%`,
          "--from-x": `${from.x - spot.x}cqw`,
          "--from-y": `${from.y - spot.y}cqh`,
          "--to-x": winnerSeat ? `${winnerSeat.x - spot.x}cqw` : "0",
          "--to-y": winnerSeat ? `${winnerSeat.y - spot.y}cqh` : "0",
          "--tilt": `${((entry.playerIndex * 37) % 15) - 7}deg`,
        } as CSSProperties;
        return (
          <PlayingCard
            key={`${entry.playerIndex}-${cardKey(entry.card)}`}
            card={entry.card}
            size="sm"
            className={`trick-card ${holding && held.sweeping ? "sweeping" : ""} ${holding && entry.playerIndex === lastTrick.winner ? "is-winning" : ""}`}
            style={style}
          />
        );
      })}
    </div>
  );
});

/** The Trix layout: four suit rows built outward from the jacks. */
export const TrixLayout = memo(function TrixLayout({ board }: { board: Card[] }) {
  const played = new Set(board.map(cardKey));
  return (
    <div className="trix-board">
      {SUITS.map((suit) => (
        <div className="trix-row" key={suit}>
          <b className={isRed(suit) ? "red" : ""}>{suit}</b>
          {Array.from({ length: 13 }, (_, i) => {
            const rank = i + 2;
            const on = played.has(`${rank}${suit}`);
            return <span className={`trix-cell ${on ? "on" : ""} ${rank === 11 ? "jack" : ""} ${isRed(suit) ? "red" : ""}`} key={rank}>{rankName(rank)}</span>;
          })}
        </div>
      ))}
    </div>
  );
});
