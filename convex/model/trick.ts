import { fail } from "./errors";
import { isSuit, sameCard, shuffledDeck } from "./cards";
import { CONTRACTS, SUITS, TARNEEB_TARGET, TRIX_KINGDOMS, type Card, type Contract, type GameState, type Player } from "./types";

export type TrickAction = "bid" | "pass" | "trump" | "play" | "selectContract";
export type TrickMove = { action: TrickAction; bid?: number; suit?: string; card?: Card; contract?: Contract };

const TRIX_LAYOUT_POINTS = [200, 150, 100, 50];
const CONTRACT_PENALTY: Record<Exclude<Contract, "trix">, (pile: Card[], tricks: number) => number> = {
  king: (pile) => (pile.some((c) => c.rank === 13 && c.suit === "♥") ? -75 : 0),
  diamonds: (pile) => pile.filter((c) => c.suit === "♦").length * -10,
  queens: (pile) => pile.filter((c) => c.rank === 12).length * -25,
  collections: (_pile, tricks) => tricks * -15,
};

function dealThirteen(players: Player[], dealerIndex: number) {
  const deck = shuffledDeck();
  for (const p of players) p.cards = [];
  for (let round = 0; round < 13; round++)
    for (let offset = 1; offset <= 4; offset++) players[(dealerIndex + offset) % 4].cards.push(deck.pop()!);
}

function resetTricks(state: GameState) {
  Object.assign(state, {
    trickCards: [], lastTrick: undefined, tricksWon: [0, 0, 0, 0], trickPiles: [[], [], [], []], finishOrder: [], board: [], winners: [],
  } satisfies Partial<GameState>);
}

export function tarneebMatchOver(scores: number[]): boolean {
  return (scores[0] ?? 0) >= TARNEEB_TARGET || (scores[1] ?? 0) >= TARNEEB_TARGET;
}

export function startTrickGame(state: GameState, now: number) {
  if (state.players.length !== 4) fail("needFourPlayers");
  for (const p of state.players) Object.assign(p, { bet: 0, committed: 0, folded: false, acted: false, cards: [] });
  resetTricks(state);
  Object.assign(state, { status: "playing", pot: 0, currentBet: 0, trump: undefined, contract: undefined } satisfies Partial<GameState>);

  if (state.game === "tarneeb") {
    if (state.handNumber === 0 || tarneebMatchOver(state.scores)) state.scores = [0, 0, 0, 0];
    const dealer = state.handNumber === 0 ? 0 : (state.dealerIndex + 1) % 4;
    dealThirteen(state.players, dealer);
    Object.assign(state, {
      phase: "bidding", dealerIndex: dealer, turnIndex: (dealer + 1) % 4, handNumber: state.handNumber + 1,
      bids: [-1, -1, -1, -1], highBid: 6, bidder: -1, event: { kind: "biddingStarted", at: now },
    } satisfies Partial<GameState>);
    return;
  }

  // Trix: every start begins a fresh tournament; contracts inside it are picked in the "contract" phase.
  const picker = state.handNumber === 0 ? 0 : (state.dealerIndex + 1) % 4;
  Object.assign(state, {
    phase: "contract", scores: [0, 0, 0, 0], kingdomsCompleted: 0, trixContractsPlayed: [], handNumber: 0,
    dealerIndex: picker, trixPicker: picker, turnIndex: picker, bids: [], highBid: 0, bidder: -1,
    event: { kind: "choosingContract", at: now, seat: picker, name: state.players[picker].name },
  } satisfies Partial<GameState>);
}

export function legalPlays(state: GameState, player: Player): Card[] {
  if (state.game === "trix" && state.contract === "trix") {
    return player.cards.filter((c) => c.rank === 11 || state.board.some((b) => b.suit === c.suit && Math.abs(b.rank - c.rank) === 1));
  }
  const lead = state.trickCards[0]?.card.suit;
  if (!lead || !player.cards.some((c) => c.suit === lead)) return [...player.cards];
  return player.cards.filter((c) => c.suit === lead);
}

export function applyTrickAction(state: GameState, seat: number, move: TrickMove, now: number) {
  if (seat !== state.turnIndex) fail("notYourTurn");
  const player = state.players[seat];
  const base = { at: now, seat, name: player.name };

  if (state.game === "tarneeb" && state.phase === "bidding") {
    if (state.bids[seat] !== -1) fail("alreadyBid");
    const opener = (state.dealerIndex + 1) % 4;
    if (move.action === "pass") {
      if (seat === opener && state.highBid === 6) fail("openingBid");
      state.bids[seat] = 0;
      state.event = { ...base, kind: "pass" };
    } else if (move.action === "bid") {
      const bid = move.bid ?? 0;
      if (!Number.isInteger(bid) || bid < 7 || bid > 13 || bid <= state.highBid) fail("bidRange");
      state.bids[seat] = bid;
      state.highBid = bid;
      state.bidder = seat;
      state.event = { ...base, kind: "bid", amount: bid };
    } else fail("chooseBid");
    const waiting = [1, 2, 3].map((step) => (seat + step) % 4).find((i) => state.bids[i] === -1);
    if (waiting !== undefined) state.turnIndex = waiting;
    else {
      state.phase = "trump";
      state.turnIndex = state.bidder;
      state.event = { kind: "bidWon", at: now, seat: state.bidder, name: state.players[state.bidder].name, amount: state.highBid };
    }
    return;
  }

  if (state.game === "tarneeb" && state.phase === "trump") {
    if (move.action !== "trump" || !isSuit(move.suit)) fail("chooseTrump");
    state.trump = move.suit;
    state.phase = "trick";
    state.turnIndex = state.bidder;
    state.event = { ...base, kind: "trumpChosen", suit: move.suit };
    return;
  }

  if (state.game === "trix" && state.phase === "contract") {
    const contract = move.contract;
    if (move.action !== "selectContract" || !contract) fail("chooseContract");
    if (state.trixContractsPlayed.includes(contract)) fail("contractPlayed");
    dealThirteen(state.players, state.trixPicker);
    resetTricks(state);
    const leader = (state.trixPicker + 1) % 4;
    Object.assign(state, {
      contract, phase: "trick", turnIndex: leader, handNumber: state.handNumber + 1,
      event: { kind: "contractStarted", at: now, contract, seat: leader, name: state.players[leader].name },
    } satisfies Partial<GameState>);
    return;
  }

  if (state.phase !== "trick") fail("actionUnavailable");
  playTrick(state, seat, move, now);
}

function playTrick(state: GameState, seat: number, move: TrickMove, now: number) {
  const player = state.players[seat];
  const base = { at: now, seat, name: player.name };
  const layout = state.game === "trix" && state.contract === "trix";
  const legal = legalPlays(state, player);

  if (move.action === "pass") {
    if (!layout || legal.length) fail("mustPlay");
    state.turnIndex = nextHolder(state.players, seat);
    state.event = { ...base, kind: "pass" };
    return;
  }
  if (move.action !== "play" || !move.card) fail("chooseCard");
  const card = move.card;
  const index = player.cards.findIndex((c) => sameCard(c, card));
  if (index < 0) fail("illegalCard");
  if (!legal.some((c) => sameCard(c, card))) fail(layout ? "illegalCard" : "followSuit");
  player.cards.splice(index, 1);
  state.event = { ...base, kind: "cardPlayed", card };

  if (layout) {
    state.board.push(card);
    if (!player.cards.length) state.finishOrder.push(seat);
    const holders = state.players.flatMap((p, i) => (p.cards.length ? [i] : []));
    if (holders.length <= 1) {
      // The last player standing takes last place without playing out their hand.
      state.finishOrder.push(...holders);
      return finishContract(state, "trix", now);
    }
    state.turnIndex = nextHolder(state.players, seat);
    return;
  }

  state.trickCards.push({ playerIndex: seat, card });
  if (state.trickCards.length < 4) {
    state.turnIndex = (seat + 1) % 4;
    return;
  }

  const lead = state.trickCards[0].card.suit;
  const value = (c: Card) => (state.trump && c.suit === state.trump ? 100 : c.suit === lead ? 50 : 0) + c.rank;
  const winner = state.trickCards.reduce((best, entry) => (value(entry.card) > value(best.card) ? entry : best)).playerIndex;
  state.tricksWon[winner] += 1;
  state.trickPiles[winner].push(...state.trickCards.map((entry) => entry.card));
  state.lastTrick = { cards: state.trickCards, winner };
  state.trickCards = [];
  state.event = { kind: "trickWon", at: now, seat: winner, name: state.players[winner].name, amount: state.tricksWon[winner] };

  const handOver = state.players.every((p) => !p.cards.length) || (state.game === "trix" && penaltiesExhausted(state));
  if (!handOver) {
    state.turnIndex = winner;
    return;
  }
  if (state.game === "tarneeb") scoreTarneeb(state, now);
  else finishContract(state, state.contract!, now);
}

function nextHolder(players: Player[], from: number): number {
  for (let step = 1; step <= 4; step++) if (players[(from + step) % 4].cards.length) return (from + step) % 4;
  return -1;
}

/** Once every penalty card is taken the rest of the hand cannot change the score. */
function penaltiesExhausted(state: GameState): boolean {
  const taken = state.trickPiles.flat();
  if (state.contract === "king") return taken.some((c) => c.rank === 13 && c.suit === "♥");
  if (state.contract === "diamonds") return taken.filter((c) => c.suit === "♦").length === 13;
  if (state.contract === "queens") return taken.filter((c) => c.rank === 12).length === 4;
  return false;
}

function scoreTarneeb(state: GameState, now: number) {
  const team = state.bidder % 2;
  const teamTricks = state.tricksWon.reduce((sum, count, i) => sum + (i % 2 === team ? count : 0), 0);
  const made = teamTricks >= state.highBid;
  // Made: the bidders score their tricks. Set: they lose the bid and the defenders score theirs.
  const points = [0, 0];
  if (made) points[team] = teamTricks;
  else { points[team] = -state.highBid; points[1 - team] = 13 - teamTricks; }
  state.scores = state.scores.map((score, i) => score + points[i % 2]);
  Object.assign(state, { phase: "showdown", status: "lobby", turnIndex: -1 } satisfies Partial<GameState>);
  for (const p of state.players) p.cards = [];

  if (tarneebMatchOver(state.scores)) {
    const champion = state.scores[0] === state.scores[1] ? team : state.scores[0] > state.scores[1] ? 0 : 1;
    state.event = { kind: "tarneebMatch", at: now, team: champion + 1, amount: state.scores[champion] };
  } else {
    state.event = { kind: "tarneebHand", at: now, team: team + 1, made, amount: state.highBid };
  }
}

function finishContract(state: GameState, contract: Contract, now: number) {
  if (contract === "trix") state.finishOrder.forEach((seat, place) => { state.scores[seat] += TRIX_LAYOUT_POINTS[place] ?? 0; });
  else state.trickPiles.forEach((pile, seat) => { state.scores[seat] += CONTRACT_PENALTY[contract](pile, state.tricksWon[seat]); });

  let played = [...state.trixContractsPlayed, contract];
  const kingdomDone = played.length === CONTRACTS.length;
  if (kingdomDone) { state.kingdomsCompleted += 1; played = []; }
  const tournamentDone = state.kingdomsCompleted >= TRIX_KINGDOMS;
  const picker = kingdomDone ? (state.trixPicker + 1) % 4 : state.trixPicker;
  for (const p of state.players) p.cards = [];
  Object.assign(state, {
    trixContractsPlayed: played, trixPicker: picker, contract: undefined, trickCards: [],
    phase: tournamentDone ? "showdown" : "contract", status: tournamentDone ? "lobby" : "playing", turnIndex: tournamentDone ? -1 : picker,
  } satisfies Partial<GameState>);

  if (tournamentDone) {
    const top = state.scores.indexOf(Math.max(...state.scores));
    state.event = { kind: "tournamentDone", at: now, seat: top, name: state.players[top].name, amount: state.scores[top] };
  } else if (contract === "trix") {
    const first = state.finishOrder[0];
    state.event = { kind: "trixFinished", at: now, seat: first, name: state.players[first].name };
  } else {
    state.event = { kind: "contractComplete", at: now, contract };
  }
}

function longestSuit(cards: Card[]): string {
  let best: string = SUITS[0];
  let bestCount = -1;
  for (const suit of SUITS) {
    const count = cards.filter((c) => c.suit === suit).length;
    if (count > bestCount) { bestCount = count; best = suit; }
  }
  return best;
}

/** The move the server makes when a player times out (or has left the table). */
export function autoTrickMove(state: GameState): TrickMove | null {
  const player = state.players[state.turnIndex];
  if (!player) return null;
  if (state.phase === "bidding") {
    const opener = (state.dealerIndex + 1) % 4;
    return state.turnIndex === opener && state.highBid <= 6 ? { action: "bid", bid: 7 } : { action: "pass" };
  }
  if (state.phase === "trump") return { action: "trump", suit: longestSuit(player.cards) };
  if (state.phase === "contract") return { action: "selectContract", contract: CONTRACTS.find((c) => !state.trixContractsPlayed.includes(c)) ?? "king" };
  if (state.phase === "trick") {
    const legal = legalPlays(state, player);
    if (!legal.length) return { action: "pass" };
    return { action: "play", card: [...legal].sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit))[0] };
  }
  return null;
}
