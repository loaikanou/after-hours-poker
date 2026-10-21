import type { Locale, MessageKey } from "../i18n";
import type { Card, Contract, GameMode, SeatPoint, TablePhase } from "../types";

const FACE: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
const SUIT_ORDER: Record<string, number> = { "♠": 0, "♥": 1, "♣": 2, "♦": 3 };

export function rankName(rank: number): string {
  return FACE[rank] ?? String(rank);
}

export function isRed(suit: string): boolean {
  return suit === "♥" || suit === "♦";
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/** Sort a hand by suit (alternating colours) then rank, the way people hold cards. */
export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || a.rank - b.rank);
}

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === "ar" ? "ar" : "en");
}

/** Replace `{name}` placeholders in a translated template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/**
 * Seats around the oval rail, rotated so the viewer always sits at the bottom
 * and play runs clockwise from there.
 */
export function seatLayout(count: number, viewerSeat: number): SeatPoint[] {
  const pivot = viewerSeat >= 0 ? viewerSeat : 0;
  return Array.from({ length: count }, (_, seat) => {
    const slot = (seat - pivot + count) % count;
    const angle = Math.PI / 2 + (slot * 2 * Math.PI) / count;
    return { x: 50 + 46 * Math.cos(angle), y: 50 + 44 * Math.sin(angle) };
  });
}

/** A point part of the way from the centre of the felt toward a seat. */
export function towardSeat(seat: SeatPoint, fraction: number): SeatPoint {
  return { x: 50 + (seat.x - 50) * fraction, y: 50 + (seat.y - 50) * fraction };
}

export const phaseKeys: Record<TablePhase, MessageKey> = {
  waiting: "phaseWaiting",
  preflop: "phasePreflop",
  flop: "phaseFlop",
  turn: "phaseTurn",
  river: "phaseRiver",
  showdown: "phaseShowdown",
  bidding: "phaseBidding",
  trump: "phaseTrump",
  contract: "phaseContract",
  trick: "phaseTrick",
};

export const contractKeys: Record<Contract, MessageKey> = {
  king: "contractKing",
  diamonds: "contractDiamonds",
  queens: "contractQueens",
  collections: "contractCollections",
  trix: "contractTrix",
};

export const contractScoreKeys: Record<Contract, MessageKey> = {
  king: "contractScoreKing",
  diamonds: "contractScoreDiamonds",
  queens: "contractScoreQueens",
  collections: "contractScoreCollections",
  trix: "contractScoreTrix",
};

export const contractOrder: Contract[] = ["king", "diamonds", "queens", "collections", "trix"];

export const gameNameKeys: Record<GameMode, MessageKey> = { poker: "gamePoker", tarneeb: "gameTarneeb", trix: "gameTrix" };
export const gameTableKeys: Record<GameMode, MessageKey> = { poker: "pokerTable", tarneeb: "tarneebTable", trix: "trixTable" };
export const gameDescriptionKeys: Record<GameMode, MessageKey> = {
  poker: "gamePokerDescription",
  tarneeb: "gameTarneebDescription",
  trix: "gameTrixDescription",
};
export const maxPlayers: Record<GameMode, number> = { poker: 6, tarneeb: 4, trix: 4 };
