import { memo, useMemo, type CSSProperties } from "react";
import { usePreferences } from "../preferences";
import { cardKey, contractKeys, contractOrder, contractScoreKeys, formatNumber, isRed, sortHand } from "../lib/format";
import { SUITS } from "../../convex/model/types";
import type { ActionValues, Card, GameAction, TableSnapshot } from "../types";
import { PlayingCard } from "./PlayingCard";

type PanelProps = { table: TableSnapshot; busy: boolean; onAction: (action: GameAction, values?: ActionValues) => void };

const BIDS = [7, 8, 9, 10, 11, 12, 13];

export function BiddingPanel({ table, busy, onAction }: PanelProps) {
  const { t, locale } = usePreferences();
  const openerMustBid = table.mySeat === (table.dealerIndex + 1) % 4 && table.highBid <= 6;
  return (
    <div className="choice-panel">
      <p>{t("bidPrompt")} {table.highBid > 6 && <b>{t("currentBid", { amount: formatNumber(table.highBid, locale) })}</b>}</p>
      <div className="bid-row">
        {BIDS.filter((bid) => bid > table.highBid).map((bid) => (
          <button key={bid} type="button" className="btn btn-outline bid-button" disabled={busy} onClick={() => onAction("bid", { bid })}>
            {formatNumber(bid, locale)}
          </button>
        ))}
        <button type="button" className="btn btn-ghost" disabled={busy || openerMustBid} onClick={() => onAction("pass")}>{t("pass")}</button>
      </div>
    </div>
  );
}

export function TrumpPanel({ busy, onAction }: PanelProps) {
  const { t } = usePreferences();
  return (
    <div className="choice-panel">
      <p>{t("chooseTrump")}</p>
      <div className="suit-row">
        {SUITS.map((suit) => (
          <button key={suit} type="button" className={`suit-button ${isRed(suit) ? "red" : ""}`} aria-label={`${t("trump")} ${suit}`} disabled={busy} onClick={() => onAction("trump", { suit })}>
            {suit}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ContractPanel({ table, busy, onAction }: PanelProps) {
  const { t } = usePreferences();
  return (
    <div className="choice-panel">
      <p>{t("selectTrixContract")}</p>
      <div className="contract-grid">
        {contractOrder.map((contract) => {
          const played = table.trixContractsPlayed.includes(contract);
          return (
            <button key={contract} type="button" className={`contract-button contract-${contract}`} disabled={busy || played} onClick={() => onAction("selectContract", { contract })}>
              <strong>{t(contractKeys[contract])}</strong>
              <small>{t(contractScoreKeys[contract])}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type HandFanProps = { table: TableSnapshot; cards: Card[]; playable: boolean; busy: boolean; onPlay: (card: Card) => void; onPass: () => void };

/** Your hand, sorted and fanned. Legal cards lift when it's your turn; the rest dim. */
export const HandFan = memo(function HandFan({ table, cards, playable, busy, onPlay, onPass }: HandFanProps) {
  const { t } = usePreferences();
  const sorted = useMemo(() => sortHand(cards), [cards]);
  const layout = table.game === "trix" && table.contract === "trix";
  const legal = useMemo(() => {
    if (!playable) return new Set<string>();
    if (layout) {
      const next = new Set(table.board.flatMap((b) => [`${b.rank - 1}${b.suit}`, `${b.rank + 1}${b.suit}`]));
      return new Set(cards.filter((c) => c.rank === 11 || next.has(cardKey(c))).map(cardKey));
    }
    const lead = table.trickCards[0]?.card.suit;
    const follow = lead && cards.some((c) => c.suit === lead);
    return new Set(cards.filter((c) => !follow || c.suit === lead).map(cardKey));
  }, [playable, layout, cards, table.board, table.trickCards]);

  return (
    <div className={`hand-fan ${playable ? "playable" : ""}`} style={{ "--count": sorted.length } as CSSProperties}>
      <div className="hand-cards">
        {sorted.map((card, i) => {
          const ok = legal.has(cardKey(card));
          return (
            <button
              key={cardKey(card)}
              type="button"
              className={`hand-card ${playable ? (ok ? "legal" : "illegal") : ""}`}
              style={{ "--i": i } as CSSProperties}
              disabled={!playable || !ok || busy}
              aria-label={`${t("playCard")} ${cardKey(card)}`}
              onClick={() => onPlay(card)}
            >
              <PlayingCard card={card} size="md" />
            </button>
          );
        })}
      </div>
      {playable && layout && legal.size === 0 && (
        <div className="hand-pass"><span>{t("noLegalCards")}</span><button type="button" className="btn btn-outline" disabled={busy} onClick={onPass}>{t("pass")}</button></div>
      )}
    </div>
  );
});
