import { fail } from "./errors";
import { nextSeat, shuffledDeck } from "./cards";
import type { Card, GameState, Player, Winner } from "./types";

/* ------------------------------------------------------------------ */
/* Hand evaluation                                                     */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "highCard", "pair", "twoPair", "trips", "straight", "flush", "fullHouse", "quads", "straightFlush",
] as const;
export type HandCategory = (typeof CATEGORIES)[number] | "royalFlush";
export type HandValue = { score: number[]; cards: Card[]; category: HandCategory };

function fiveCardScore(cards: Card[]): number[] {
  const values = cards.map((c) => c.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const unique = [...new Set(values)];
  const straightHigh = unique.length === 5 && unique[0] - unique[4] === 4 ? unique[0] : unique.join(",") === "14,5,4,3,2" ? 5 : 0;
  const kickers = groups.slice(1).map(([rank]) => rank);
  if (flush && straightHigh) return [8, straightHigh];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (flush) return [5, ...values];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][1] === 3) return [3, groups[0][0], ...kickers];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, groups[0][0], groups[1][0], groups[2][0]];
  if (groups[0][1] === 2) return [1, groups[0][0], ...kickers];
  return [0, ...values];
}

export function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

/** Best five-card hand out of 5–7 cards. */
export function evaluateHand(cards: Card[]): HandValue {
  let best: { score: number[]; cards: Card[] } | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++)
    for (let c = b + 1; c < n - 2; c++) for (let d = c + 1; d < n - 1; d++)
      for (let e = d + 1; e < n; e++) {
        const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
        const score = fiveCardScore(five);
        if (!best || compareScores(score, best.score) > 0) best = { score, cards: five };
      }
  if (!best) throw new Error("A hand needs at least five cards.");
  const category: HandCategory = best.score[0] === 8 && best.score[1] === 14 ? "royalFlush" : CATEGORIES[best.score[0]];
  return { ...best, category };
}

/* ------------------------------------------------------------------ */
/* Betting                                                             */
/* ------------------------------------------------------------------ */

export type PokerAction = "fold" | "check" | "call" | "raise" | "allIn";

const inHand = (p: Player) => !p.folded;
const canAct = (p: Player) => !p.folded && p.chips > 0;

/** Move up to `amount` chips from the stack into the current bet. Short stacks go all-in. */
function put(player: Player, amount: number): number {
  const paid = Math.max(0, Math.min(amount, player.chips));
  player.chips -= paid;
  player.bet += paid;
  player.committed = (player.committed ?? 0) + paid;
  return paid;
}

function syncPot(state: GameState) {
  state.pot = state.players.reduce((sum, p) => sum + (p.committed ?? 0), 0);
}

export function startPokerHand(state: GameState, now: number) {
  const { players } = state;
  for (const p of players) Object.assign(p, { bet: 0, committed: 0, folded: p.chips <= 0, acted: false, cards: [] });
  const seated = players.filter(inHand);
  if (seated.length < 2) fail("needPlayers");

  const dealer = state.handNumber === 0 ? players.findIndex(inHand) : nextSeat(players, state.dealerIndex, inHand);
  // Heads-up the dealer posts the small blind and acts first preflop.
  const small = seated.length === 2 ? dealer : nextSeat(players, dealer, inHand);
  const big = nextSeat(players, small, inHand);

  const deck = shuffledDeck();
  for (let round = 0; round < 2; round++)
    for (let offset = 1; offset <= players.length; offset++) {
      const p = players[(dealer + offset) % players.length];
      if (!p.folded) p.cards.push(deck.pop()!);
    }
  put(players[small], state.smallBlind);
  put(players[big], state.bigBlind);

  Object.assign(state, {
    status: "playing", phase: "preflop", board: [], deck, currentBet: state.bigBlind, lastRaise: state.bigBlind,
    dealerIndex: dealer, handNumber: state.handNumber + 1, winners: [], turnIndex: big,
    event: { kind: "handStarted", at: now, amount: state.handNumber + 1 },
  } satisfies Partial<GameState>);
  syncPot(state);
  advance(state, big, now);
}

export function applyPokerAction(state: GameState, seat: number, action: PokerAction, amount: number | undefined, now: number) {
  if (seat !== state.turnIndex) fail("notYourTurn");
  const player = state.players[seat];
  const due = state.currentBet - player.bet;
  const base = { at: now, seat, name: player.name };

  if (action === "fold") {
    player.folded = true;
    state.event = { ...base, kind: "fold" };
  } else if (action === "check") {
    if (due > 0) fail("callOrFold");
    state.event = { ...base, kind: "check" };
  } else if (action === "call") {
    if (due <= 0) fail("nothingToCall");
    const paid = put(player, due);
    state.event = player.chips === 0 ? { ...base, kind: "allIn", amount: player.bet } : { ...base, kind: "call", amount: paid };
  } else {
    const maxTo = player.bet + player.chips;
    const minTo = state.currentBet + state.lastRaise;
    const target = action === "allIn" ? maxTo : (amount ?? minTo);
    if (!Number.isInteger(target) || target <= 0) fail("invalidInput");
    if (target > maxTo) fail("raiseTooLarge", maxTo);
    if (target <= state.currentBet) {
      // An all-in that cannot even cover the call is just a short call.
      if (action !== "allIn") fail("raiseTooSmall", Math.min(minTo, maxTo));
      put(player, player.chips);
      state.event = { ...base, kind: "allIn", amount: player.bet };
    } else {
      if (target < minTo && target !== maxTo) fail("raiseTooSmall", minTo);
      const increment = target - state.currentBet;
      put(player, target - player.bet);
      // Only a full raise re-opens the action for players who already acted.
      if (increment >= state.lastRaise) {
        state.lastRaise = increment;
        for (const other of state.players) if (other !== player && canAct(other)) other.acted = false;
      }
      state.currentBet = target;
      state.event = { ...base, kind: player.chips === 0 ? "allIn" : "raise", amount: target };
    }
  }
  player.acted = true;
  syncPot(state);
  advance(state, seat, now);
}

/** A player walking away mid-hand forfeits; the hand continues without them. */
export function foldOut(state: GameState, seat: number, now: number) {
  if (seat === state.turnIndex) return applyPokerAction(state, seat, "fold", undefined, now);
  const player = state.players[seat];
  player.folded = true;
  player.acted = true;
  if (state.players.filter(inHand).length === 1) awardUncontested(state, now);
}

export function autoPokerMove(state: GameState): { action: PokerAction } {
  const player = state.players[state.turnIndex];
  return { action: !player.left && state.currentBet - player.bet <= 0 ? "check" : "fold" };
}

/** Close the betting round if everyone is square, deal the next street, or hand the turn on. */
function advance(state: GameState, from: number, now: number) {
  const { players } = state;
  if (players.filter(inHand).length === 1) return awardUncontested(state, now);
  const actors = players.filter(canAct);
  const roundDone = actors.every((p) => p.acted && p.bet === state.currentBet);
  if (!roundDone) {
    state.turnIndex = nextSeat(players, from, canAct);
    return;
  }
  for (const p of players) { p.bet = 0; p.acted = false; }
  state.currentBet = 0;
  state.lastRaise = state.bigBlind;
  // With fewer than two players able to bet, run the board out and show down.
  if (actors.length < 2 || state.phase === "river") {
    while (state.board.length < 5) state.board.push(state.deck.pop()!);
    return showdown(state, now);
  }
  if (state.phase === "preflop") { state.board.push(state.deck.pop()!, state.deck.pop()!, state.deck.pop()!); state.phase = "flop"; }
  else if (state.phase === "flop") { state.board.push(state.deck.pop()!); state.phase = "turn"; }
  else { state.board.push(state.deck.pop()!); state.phase = "river"; }
  state.turnIndex = nextSeat(players, state.dealerIndex, canAct);
}

function endHand(state: GameState, winners: Winner[]) {
  for (const w of winners) state.players[w.seat].chips += w.amount;
  Object.assign(state, { winners, pot: 0, phase: "showdown", status: "lobby", turnIndex: -1, currentBet: 0 } satisfies Partial<GameState>);
  for (const p of state.players) p.bet = 0;
}

function awardUncontested(state: GameState, now: number) {
  syncPot(state);
  const seat = state.players.findIndex(inHand);
  const winner = state.players[seat];
  endHand(state, [{ seat, amount: state.pot }]);
  state.event = { kind: "takesPot", at: now, seat, name: winner.name, amount: state.winners[0].amount };
}

export type Pot = { amount: number; eligible: number[] };

/** Split everyone's contributions into a main pot and side pots by all-in level. */
export function buildPots(players: Player[]): Pot[] {
  const committed = players.map((p) => p.committed ?? 0);
  const levels = [...new Set(players.filter(inHand).map((p) => p.committed ?? 0))].filter((c) => c > 0).sort((a, b) => a - b);
  const pots: Pot[] = [];
  let previous = 0;
  for (const level of levels) {
    const amount = committed.reduce((sum, c) => sum + Math.max(0, Math.min(c, level) - previous), 0);
    const eligible = players.flatMap((p, i) => (inHand(p) && committed[i] >= level ? [i] : []));
    pots.push({ amount, eligible });
    previous = level;
  }
  const dead = committed.reduce((sum, c) => sum + Math.max(0, c - previous), 0);
  if (dead && pots.length) pots[pots.length - 1].amount += dead;
  return pots;
}

function showdown(state: GameState, now: number) {
  const { players, board } = state;
  const hands = new Map(players.flatMap((p, i) => (inHand(p) ? [[i, evaluateHand([...p.cards, ...board])] as const] : [])));
  const won = new Map<number, number>();
  // Odd chips go to the first winner clockwise from the dealer.
  const order = (seat: number) => (seat - state.dealerIndex - 1 + players.length) % players.length;

  for (const pot of buildPots(players)) {
    let best: number[] | null = null;
    for (const seat of pot.eligible) {
      const score = hands.get(seat)!.score;
      if (!best || compareScores(score, best) > 0) best = score;
    }
    const potWinners = pot.eligible.filter((seat) => compareScores(hands.get(seat)!.score, best!) === 0).sort((a, b) => order(a) - order(b));
    const share = Math.floor(pot.amount / potWinners.length);
    potWinners.forEach((seat, i) => won.set(seat, (won.get(seat) ?? 0) + share + (i === 0 ? pot.amount - share * potWinners.length : 0)));
  }

  const winners: Winner[] = [...won].map(([seat, amount]) => {
    const hand = hands.get(seat)!;
    return { seat, amount, hand: hand.category, cards: hand.cards };
  });
  endHand(state, winners);
  // Seats that only got an uncalled bet back did not really "win" the showdown.
  const champions = winners.filter((w) => compareScores(hands.get(w.seat)!.score, bestOf(winners.map((x) => hands.get(x.seat)!.score))) === 0);
  state.event = champions.length === 1
    ? { kind: "winsShowdown", at: now, seat: champions[0].seat, name: players[champions[0].seat].name, hand: champions[0].hand, amount: champions[0].amount }
    : { kind: "splitPot", at: now, names: champions.map((w) => players[w.seat].name), hand: champions[0].hand };
}

function bestOf(scores: number[][]): number[] {
  return scores.reduce((best, score) => (compareScores(score, best) > 0 ? score : best));
}
