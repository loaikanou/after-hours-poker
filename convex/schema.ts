import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  cardValidator, contractValidator, eventValidator, gameValidator, lastTrickValidator, phaseValidator,
  playerValidator, trickCardValidator, winnerValidator,
} from "./model/types";

export default defineSchema({
  tables: defineTable({
    code: v.string(),
    game: v.optional(gameValidator),
    name: v.string(),
    hostKey: v.string(),
    status: v.union(v.literal("lobby"), v.literal("playing")),
    phase: phaseValidator,
    board: v.array(cardValidator),
    pot: v.number(),
    currentBet: v.number(),
    /** Size of the last full raise this street; the minimum re-raise increment. */
    lastRaise: v.optional(v.number()),
    turnIndex: v.number(),
    turnStartedAt: v.optional(v.number()),
    /** The pending auto-play job for the current turn, cancelled when the turn ends early. */
    timerId: v.optional(v.id("_scheduled_functions")),
    dealerIndex: v.number(),
    smallBlind: v.number(),
    bigBlind: v.number(),
    handNumber: v.number(),
    players: v.array(playerValidator),
    deck: v.array(cardValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** Legacy free-text status line; superseded by `event`. */
    message: v.optional(v.string()),
    event: v.optional(eventValidator),
    winners: v.optional(v.array(winnerValidator)),
    bids: v.optional(v.array(v.number())),
    highBid: v.optional(v.number()),
    bidder: v.optional(v.number()),
    trump: v.optional(v.string()),
    trickCards: v.optional(v.array(trickCardValidator)),
    lastTrick: v.optional(lastTrickValidator),
    tricksWon: v.optional(v.array(v.number())),
    scores: v.optional(v.array(v.number())),
    trickPiles: v.optional(v.array(v.array(cardValidator))),
    trixPicker: v.optional(v.number()),
    kingdomsCompleted: v.optional(v.number()),
    trixContractsPlayed: v.optional(v.array(v.string())),
    finishOrder: v.optional(v.array(v.number())),
    contract: v.optional(contractValidator),
  })
    .index("by_code", ["code"])
    .index("by_updatedAt", ["updatedAt"]),
});
