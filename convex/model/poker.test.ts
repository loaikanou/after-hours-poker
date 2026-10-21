import { describe, expect, test } from "vitest";
import { applyPokerAction, buildPots, evaluateHand, startPokerHand } from "./poker";
import { STARTING_CHIPS, type Card, type GameState, type Player } from "./types";

const c = (text: string): Card => {
  const rank = { T: 10, J: 11, Q: 12, K: 13, A: 14 }[text[0]] ?? Number(text[0]);
  const suit = { s: "♠", h: "♥", d: "♦", c: "♣" }[text[1]]!;
  return { rank, suit };
};
const hand = (text: string) => text.split(" ").map(c);

function player(name: string, chips = STARTING_CHIPS, extra: Partial<Player> = {}): Player {
  return { key: name, name, chips, bet: 0, committed: 0, folded: false, acted: false, cards: [], ...extra };
}

function table(players: Player[]): GameState {
  return {
    game: "poker", status: "lobby", phase: "waiting", board: [], pot: 0, currentBet: 0, lastRaise: 20, turnIndex: -1,
    dealerIndex: 0, smallBlind: 10, bigBlind: 20, handNumber: 0, players, deck: [], event: { kind: "waiting", at: 0 },
    winners: [], bids: [], highBid: 0, bidder: -1, trump: undefined, trickCards: [], lastTrick: undefined,
    tricksWon: players.map(() => 0), scores: players.map(() => 0), trickPiles: players.map(() => []),
    trixPicker: 0, kingdomsCompleted: 0, trixContractsPlayed: [], finishOrder: [], contract: undefined,
  };
}

describe("evaluateHand", () => {
  test.each([
    ["As Ks Qs Js Ts 2d 3c", "royalFlush"],
    ["9s 8s 7s 6s 5s Ad Ac", "straightFlush"],
    ["9s 9h 9d 9c 2s 3d 4c", "quads"],
    ["9s 9h 9d 4c 4s 3d 2c", "fullHouse"],
    ["As 9s 7s 4s 2s Kd Kc", "flush"],
    ["As 2d 3c 4h 5s Kd Qc", "straight"],
    ["9s 9h 9d Ac 4s 3d 2c", "trips"],
    ["9s 9h 4d 4c As 3d 2c", "twoPair"],
    ["9s 9h 4d 7c As 3d 2c", "pair"],
    ["As Jh 9d 7c 5s 3d 2c", "highCard"],
  ])("%s is a %s", (cards, category) => {
    expect(evaluateHand(hand(cards)).category).toBe(category);
  });

  test("a wheel loses to a six-high straight", () => {
    const wheel = evaluateHand(hand("As 2d 3c 4h 5s"));
    const six = evaluateHand(hand("2d 3c 4h 5s 6s"));
    expect(six.score[1]).toBeGreaterThan(wheel.score[1]);
  });
});

describe("buildPots", () => {
  test("splits a short all-in into a main pot and a side pot", () => {
    const pots = buildPots([
      player("a", 0, { committed: 100 }),
      player("b", 0, { committed: 300 }),
      player("c", 0, { committed: 300 }),
    ]);
    expect(pots).toEqual([
      { amount: 300, eligible: [0, 1, 2] },
      { amount: 400, eligible: [1, 2] },
    ]);
  });

  test("folded chips stay in the pot but folded players are not eligible", () => {
    const pots = buildPots([player("a", 0, { committed: 50, folded: true }), player("b", 0, { committed: 100 }), player("c", 0, { committed: 100 })]);
    expect(pots).toEqual([{ amount: 250, eligible: [1, 2] }]);
  });
});

describe("betting", () => {
  test("heads-up: the dealer posts the small blind and acts first", () => {
    const state = table([player("a"), player("b")]);
    startPokerHand(state, 1);
    expect(state.dealerIndex).toBe(0);
    expect(state.players[0].bet).toBe(10);
    expect(state.players[1].bet).toBe(20);
    expect(state.turnIndex).toBe(0);
    expect(state.pot).toBe(30);
  });

  test("an all-in call runs the board out and pays the side pot back", () => {
    const state = table([player("a", 100), player("b", 1000)]);
    startPokerHand(state, 1);
    applyPokerAction(state, 0, "allIn", undefined, 2);
    expect(state.event.kind).toBe("allIn");
    applyPokerAction(state, 1, "call", undefined, 3);
    expect(state.phase).toBe("showdown");
    expect(state.board).toHaveLength(5);
    expect(state.players[0].chips + state.players[1].chips).toBe(1100);
  });

  test("a raise must be at least the last raise unless it is all-in", () => {
    const state = table([player("a"), player("b"), player("c")]);
    startPokerHand(state, 1);
    const actor = state.turnIndex;
    expect(() => applyPokerAction(state, actor, "raise", 30, 2)).toThrow();
    applyPokerAction(state, actor, "raise", 60, 2);
    expect(state.currentBet).toBe(60);
    expect(state.lastRaise).toBe(40);
  });

  test("everyone folding hands the pot over without a showdown", () => {
    const state = table([player("a"), player("b"), player("c")]);
    startPokerHand(state, 1);
    applyPokerAction(state, state.turnIndex, "fold", undefined, 2);
    applyPokerAction(state, state.turnIndex, "fold", undefined, 3);
    expect(state.phase).toBe("showdown");
    expect(state.event.kind).toBe("takesPot");
    expect(state.winners[0].hand).toBeUndefined();
    expect(state.players.reduce((sum, p) => sum + p.chips, 0)).toBe(3 * STARTING_CHIPS);
  });
});
