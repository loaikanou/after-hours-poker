import type { Doc } from "../_generated/dataModel";
import type { Contract, GameState } from "./types";

/** Read a table document into a deep-copied, fully defaulted engine state. */
export function toState(table: Doc<"tables">): GameState {
  const seats = table.players.length;
  const zeros = () => table.players.map(() => 0);
  return {
    game: table.game ?? "poker",
    status: table.status,
    phase: table.phase,
    board: [...table.board],
    pot: table.pot,
    currentBet: table.currentBet,
    lastRaise: table.lastRaise ?? table.bigBlind,
    turnIndex: table.turnIndex,
    dealerIndex: table.dealerIndex,
    smallBlind: table.smallBlind,
    bigBlind: table.bigBlind,
    handNumber: table.handNumber,
    players: table.players.map((p) => ({ ...p, cards: [...p.cards] })),
    deck: [...table.deck],
    event: table.event ?? { kind: "waiting", at: table.createdAt },
    winners: table.winners ?? [],
    bids: [...(table.bids ?? table.players.map(() => -1))],
    highBid: table.highBid ?? 0,
    bidder: table.bidder ?? -1,
    trump: table.trump,
    trickCards: [...(table.trickCards ?? [])],
    lastTrick: table.lastTrick,
    tricksWon: table.tricksWon?.length === seats ? [...table.tricksWon] : zeros(),
    scores: table.scores?.length === seats ? [...table.scores] : zeros(),
    trickPiles: table.trickPiles?.length === seats ? table.trickPiles.map((pile) => [...pile]) : table.players.map(() => []),
    trixPicker: table.trixPicker ?? 0,
    kingdomsCompleted: table.kingdomsCompleted ?? 0,
    trixContractsPlayed: [...((table.trixContractsPlayed ?? []) as Contract[])],
    finishOrder: [...(table.finishOrder ?? [])],
    contract: table.contract,
  };
}

/** Every engine-owned field, ready for `ctx.db.patch` (undefined clears an optional field). */
export function toPatch(state: GameState) {
  return {
    game: state.game, status: state.status, phase: state.phase, board: state.board, pot: state.pot,
    currentBet: state.currentBet, lastRaise: state.lastRaise, turnIndex: state.turnIndex, dealerIndex: state.dealerIndex,
    handNumber: state.handNumber, players: state.players, deck: state.deck, event: state.event, winners: state.winners,
    bids: state.bids, highBid: state.highBid, bidder: state.bidder, trump: state.trump, trickCards: state.trickCards,
    lastTrick: state.lastTrick, tricksWon: state.tricksWon, scores: state.scores, trickPiles: state.trickPiles,
    trixPicker: state.trixPicker, kingdomsCompleted: state.kingdomsCompleted, trixContractsPlayed: state.trixContractsPlayed,
    finishOrder: state.finishOrder, contract: state.contract,
  };
}
