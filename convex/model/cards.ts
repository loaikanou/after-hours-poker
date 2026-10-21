import { SUITS, type Card } from "./types";

export function shuffledDeck(): Card[] {
  const deck: Card[] = SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: i + 2, suit })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function isSuit(value: string | undefined): value is (typeof SUITS)[number] {
  return SUITS.some((suit) => suit === value);
}

/** Next seat clockwise from `from` that satisfies `eligible`, or -1 if none does. */
export function nextSeat<T>(seats: T[], from: number, eligible: (seat: T, index: number) => boolean): number {
  for (let step = 1; step <= seats.length; step++) {
    const index = (from + step) % seats.length;
    if (eligible(seats[index], index)) return index;
  }
  return -1;
}
