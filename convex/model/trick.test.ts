import { describe, expect, test } from "vitest";
import { applyTrickAction, autoTrickMove, startTrickGame, tarneebMatchOver } from "./trick";
import type { Game, GameState, Player } from "./types";

function table(game: Game): GameState {
  const players: Player[] = ["a", "b", "c", "d"].map((name) => ({ key: name, name, chips: 0, bet: 0, folded: false, acted: false, cards: [] }));
  return {
    game, status: "lobby", phase: "waiting", board: [], pot: 0, currentBet: 0, lastRaise: 0, turnIndex: -1,
    dealerIndex: 0, smallBlind: 0, bigBlind: 0, handNumber: 0, players, deck: [], event: { kind: "waiting", at: 0 },
    winners: [], bids: [], highBid: 0, bidder: -1, trump: undefined, trickCards: [], lastTrick: undefined,
    tricksWon: [0, 0, 0, 0], scores: [0, 0, 0, 0], trickPiles: [[], [], [], []],
    trixPicker: 0, kingdomsCompleted: 0, trixContractsPlayed: [], finishOrder: [], contract: undefined,
  };
}

/** Let the server's fallback player make every move until the table stops. */
function autoplay(state: GameState, limit = 5000) {
  let moves = 0;
  while (state.turnIndex >= 0 && state.phase !== "showdown" && moves++ < limit) {
    applyTrickAction(state, state.turnIndex, autoTrickMove(state)!, moves);
  }
  return moves;
}

describe("tarneeb", () => {
  test("a hand bids, picks trump, plays 13 tricks and scores a team", () => {
    const state = table("tarneeb");
    startTrickGame(state, 0);
    expect(state.players.every((p) => p.cards.length === 13)).toBe(true);
    autoplay(state);
    expect(state.phase).toBe("showdown");
    expect(state.tricksWon.reduce((a, b) => a + b, 0)).toBe(13);
    expect(state.highBid).toBe(7);
    expect(["tarneebHand", "tarneebMatch"]).toContain(state.event.kind);
    // Partners share a score.
    expect(state.scores[0]).toBe(state.scores[2]);
    expect(state.scores[1]).toBe(state.scores[3]);
  });

  test("a match runs until a team reaches the target", () => {
    const state = table("tarneeb");
    for (let hand = 0; hand < 200 && !tarneebMatchOver(state.scores); hand++) {
      startTrickGame(state, hand);
      autoplay(state);
    }
    expect(tarneebMatchOver(state.scores)).toBe(true);
    expect(state.event.kind).toBe("tarneebMatch");
  });
});

describe("trix", () => {
  test("a tournament plays four kingdoms of five contracts", () => {
    const state = table("trix");
    startTrickGame(state, 0);
    autoplay(state, 20_000);
    expect(state.phase).toBe("showdown");
    expect(state.kingdomsCompleted).toBe(4);
    expect(state.handNumber).toBe(20);
    expect(state.event.kind).toBe("tournamentDone");
    // Each kingdom hands out exactly 500 layout points and -75 -130 -100 -195 in penalties.
    expect(state.scores.reduce((a, b) => a + b, 0)).toBe(4 * (500 - 75 - 130 - 100 - 195));
  });
});
