import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { fail } from "./model/errors";
import { applyPokerAction, autoPokerMove, foldOut, startPokerHand, type PokerAction } from "./model/poker";
import { applyTrickAction, autoTrickMove, startTrickGame, tarneebMatchOver, type TrickAction, type TrickMove } from "./model/trick";
import { toPatch, toState } from "./model/state";
import {
  AVATARS, MAX_PLAYERS, STARTING_CHIPS, cardValidator, contractValidator, eventValidator, gameValidator,
  lastTrickValidator, phaseValidator, trickCardValidator, winnerValidator, type Avatar, type GameState, type Player,
} from "./model/types";

/** Milliseconds a player has to act before the server plays for them. */
const TURN_MS = 30_000;
/** How quickly the server plays for a seat whose player has left. */
const BOT_MS = 1_500;
/** Tables untouched for this long are removed by the cleanup cron. */
const STALE_MS = 12 * 60 * 60 * 1000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const visiblePlayer = v.object({
  name: v.string(), avatar: v.string(), chips: v.number(), bet: v.number(), folded: v.boolean(), left: v.boolean(),
  isYou: v.boolean(), isHost: v.boolean(), cards: v.array(cardValidator), cardsRemaining: v.number(),
  tricksWon: v.number(), score: v.number(),
});
const snapshot = v.object({
  _id: v.id("tables"), code: v.string(), name: v.string(), status: v.union(v.literal("lobby"), v.literal("playing")),
  game: gameValidator, phase: phaseValidator, board: v.array(cardValidator), pot: v.number(), currentBet: v.number(),
  lastRaise: v.number(), turnIndex: v.number(), turnStartedAt: v.number(), turnDurationMs: v.number(), dealerIndex: v.number(),
  smallBlind: v.number(), bigBlind: v.number(), handNumber: v.number(), isHost: v.boolean(), mySeat: v.number(),
  players: v.array(visiblePlayer), event: eventValidator, winners: v.array(winnerValidator),
  bids: v.array(v.number()), highBid: v.number(), bidder: v.number(), trump: v.union(v.string(), v.null()),
  trickCards: v.array(trickCardValidator), lastTrick: v.union(lastTrickValidator, v.null()),
  contract: v.union(contractValidator, v.null()), trixPicker: v.number(), kingdomsCompleted: v.number(),
  trixContractsPlayed: v.array(v.string()), finishOrder: v.array(v.number()),
});

const pokerActions = ["fold", "check", "call", "raise", "allIn"] as const;
const trickActions = ["bid", "pass", "trump", "play", "selectContract"] as const;
const actionValidator = v.union(
  v.literal("fold"), v.literal("check"), v.literal("call"), v.literal("raise"), v.literal("allIn"),
  v.literal("bid"), v.literal("pass"), v.literal("trump"), v.literal("play"), v.literal("selectContract"),
);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function cleanKey(key: string): string {
  if (key.length < 8 || key.length > 64) fail("invalidInput");
  return key;
}

function cleanName(name: string, fallback: string, max: number): string {
  return name.trim().replace(/\s+/g, " ").slice(0, max) || fallback;
}

function cleanAvatar(avatar: string | undefined, seat: number): Avatar {
  return AVATARS.find((option) => option === avatar) ?? AVATARS[seat % AVATARS.length];
}

async function findTable(ctx: QueryCtx, code: string): Promise<Doc<"tables"> | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) return null;
  return await ctx.db.query("tables").withIndex("by_code", (q) => q.eq("code", normalized)).unique();
}

async function requireTable(ctx: QueryCtx, code: string): Promise<Doc<"tables">> {
  return (await findTable(ctx, code)) ?? fail("notFound");
}

function turnIsLive(state: Pick<GameState, "phase" | "turnIndex">): boolean {
  return state.turnIndex >= 0 && state.phase !== "waiting" && state.phase !== "showdown";
}

/** Cancel a pending timer. Cancelling one that already ran throws, so check its state first. */
async function cancelTimer(ctx: MutationCtx, timerId: Id<"_scheduled_functions"> | undefined) {
  if (!timerId) return;
  const job = await ctx.db.system.get("_scheduled_functions", timerId);
  if (job?.state.kind === "pending") await ctx.scheduler.cancel(timerId);
}

/**
 * Persist engine state. When the turn moved (`rearm`), the previous turn's
 * auto-play job is cancelled and a fresh one is scheduled for the new turn.
 */
async function commit(
  ctx: MutationCtx,
  table: Doc<"tables">,
  state: GameState,
  { rearm = true, extra = {} }: { rearm?: boolean; extra?: Partial<Doc<"tables">> } = {},
) {
  const now = Date.now();
  const timer: { turnStartedAt?: number; timerId?: Id<"_scheduled_functions"> } = {};
  if (rearm) {
    await cancelTimer(ctx, table.timerId);
    if (turnIsLive(state)) {
      const delay = state.players[state.turnIndex]?.left ? BOT_MS : TURN_MS;
      timer.turnStartedAt = now;
      timer.timerId = await ctx.scheduler.runAfter(delay, internal.tables.autoAct, { tableId: table._id, turnStartedAt: now });
    } else {
      timer.turnStartedAt = undefined;
      timer.timerId = undefined;
    }
  }
  await ctx.db.patch("tables", table._id, { ...toPatch(state), ...timer, ...extra, message: undefined, updatedAt: now });
}

type Move = { action: PokerAction | TrickAction; amount?: number } & Omit<TrickMove, "action">;

function performMove(state: GameState, seat: number, move: Move, now: number) {
  if (state.game === "poker") {
    const action = pokerActions.find((a) => a === move.action) ?? fail("actionUnavailable");
    applyPokerAction(state, seat, action, move.amount, now);
  } else {
    const action = trickActions.find((a) => a === move.action) ?? fail("actionUnavailable");
    applyTrickAction(state, seat, { ...move, action }, now);
  }
}

/** Drop a seat between hands, keeping per-seat arrays and the dealer button aligned. */
function removeSeat(state: GameState, seat: number) {
  for (const list of [state.players, state.scores, state.tricksWon, state.trickPiles, state.bids] as unknown[][]) {
    if (list.length > seat) list.splice(seat, 1);
  }
  if (state.dealerIndex > seat || state.dealerIndex >= state.players.length) state.dealerIndex = Math.max(0, state.dealerIndex - 1);
  state.winners = [];
  state.lastTrick = undefined;
}

function newPlayer(key: string, name: string, avatar: Avatar, sittingOut: boolean): Player {
  return { key, name, avatar, chips: STARTING_CHIPS, bet: 0, committed: 0, folded: sittingOut, acted: false, cards: [] };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** A per-player view of the table: other players' cards stay hidden until a contested showdown. */
export const get = query({
  args: { code: v.string(), playerKey: v.string() },
  returns: v.union(v.null(), snapshot),
  handler: async (ctx, { code, playerKey }) => {
    const table = await findTable(ctx, code);
    if (!table) return null;
    const state = toState(table);
    const reveal = state.game === "poker" && state.phase === "showdown" && state.winners.some((w) => w.hand !== undefined);
    const current = state.players[state.turnIndex];
    return {
      _id: table._id, code: table.code, name: table.name, status: state.status, game: state.game, phase: state.phase,
      board: state.board, pot: state.pot, currentBet: state.currentBet, lastRaise: state.lastRaise, turnIndex: state.turnIndex,
      turnStartedAt: table.turnStartedAt ?? 0, turnDurationMs: current?.left ? BOT_MS : TURN_MS,
      dealerIndex: state.dealerIndex, smallBlind: state.smallBlind, bigBlind: state.bigBlind, handNumber: state.handNumber,
      isHost: table.hostKey === playerKey, mySeat: state.players.findIndex((p) => p.key === playerKey),
      event: state.event, winners: state.winners, bids: state.bids, highBid: state.highBid, bidder: state.bidder,
      trump: state.trump ?? null, trickCards: state.trickCards, lastTrick: state.lastTrick ?? null, contract: state.contract ?? null,
      trixPicker: state.trixPicker, kingdomsCompleted: state.kingdomsCompleted, trixContractsPlayed: state.trixContractsPlayed,
      finishOrder: state.finishOrder,
      players: state.players.map((p, i) => {
        const isYou = p.key === playerKey;
        return {
          name: p.name, avatar: cleanAvatar(p.avatar, i), chips: p.chips, bet: p.bet, folded: p.folded, left: p.left ?? false,
          isYou, isHost: p.key === table.hostKey, cards: isYou || (reveal && !p.folded) ? p.cards : [],
          cardsRemaining: p.cards.length, tricksWon: state.tricksWon[i] ?? 0, score: state.scores[i] ?? 0,
        };
      }),
    };
  },
});

export const create = mutation({
  args: { name: v.string(), playerName: v.string(), playerKey: v.string(), game: v.optional(gameValidator), avatar: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const key = cleanKey(args.playerKey);
    let code = "";
    for (let attempt = 0; attempt < 10 && (!code || (await findTable(ctx, code))); attempt++) {
      code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    }
    const now = Date.now();
    const playerName = cleanName(args.playerName, "Player", 18);
    await ctx.db.insert("tables", {
      code, game: args.game ?? "poker", name: cleanName(args.name, "Midnight Table", 32), hostKey: key,
      status: "lobby", phase: "waiting", board: [], pot: 0, currentBet: 0, lastRaise: 20, turnIndex: -1,
      dealerIndex: 0, smallBlind: 10, bigBlind: 20, handNumber: 0,
      players: [newPlayer(key, playerName, cleanAvatar(args.avatar, 0), false)], deck: [],
      createdAt: now, updatedAt: now, event: { kind: "waiting", at: now },
      bids: [], highBid: 0, bidder: -1, trickCards: [], tricksWon: [0], scores: [0], trickPiles: [[]],
      trixPicker: 0, kingdomsCompleted: 0, trixContractsPlayed: [], finishOrder: [], winners: [],
    });
    return code;
  },
});

export const join = mutation({
  args: { code: v.string(), playerName: v.string(), playerKey: v.string(), avatar: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = cleanKey(args.playerKey);
    const table = await requireTable(ctx, args.code);
    const state = toState(table);
    const now = Date.now();
    const name = cleanName(args.playerName, "Player", 18);
    const existing = state.players.findIndex((p) => p.key === key);
    let seat = existing;
    let rearm = false;

    if (existing >= 0) {
      // Coming back after walking away: reclaim the seat (still folded until the next poker hand).
      if (!state.players[existing].left) return null;
      state.players[existing].left = false;
      rearm = existing === state.turnIndex;
    } else {
      const vacated = state.players.findIndex((p) => p.left);
      if (state.game !== "poker" && vacated >= 0) {
        // Take over an abandoned seat, cards, score and all, so the game can carry on.
        Object.assign(state.players[vacated], { key, name, avatar: cleanAvatar(args.avatar, vacated), left: false });
        seat = vacated;
        rearm = vacated === state.turnIndex;
      } else {
        if (state.players.length >= MAX_PLAYERS[state.game]) fail("full");
        if (state.game !== "poker" && state.status === "playing") fail("gameStarted");
        seat = state.players.length;
        state.players.push(newPlayer(key, name, cleanAvatar(args.avatar, seat), state.status === "playing"));
        state.scores.push(0);
        state.tricksWon.push(0);
        state.trickPiles.push([]);
      }
    }
    state.event = { kind: "joined", at: now, seat, name: state.players[seat].name };
    await commit(ctx, table, state, { rearm });
    return null;
  },
});

export const leave = mutation({
  args: { code: v.string(), playerKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerKey }) => {
    const table = await findTable(ctx, code);
    if (!table) return null;
    const state = toState(table);
    const seat = state.players.findIndex((p) => p.key === playerKey);
    if (seat < 0) return null;
    const now = Date.now();
    const name = state.players[seat].name;
    const turnBefore = state.turnIndex;
    const betweenHands = state.phase === "waiting"
      || (state.game === "poker" && state.status === "lobby")
      || (state.phase === "showdown" && (state.game === "trix" || tarneebMatchOver(state.scores)));

    if (betweenHands) removeSeat(state, seat);
    else {
      state.players[seat].left = true;
      if (state.game === "poker") foldOut(state, seat, now);
    }

    const remaining = state.players.filter((p) => !p.left);
    if (!remaining.length) {
      await cancelTimer(ctx, table.timerId);
      await ctx.db.delete("tables", table._id);
      return null;
    }
    if (state.phase !== "showdown" || betweenHands) state.event = { kind: "left", at: now, name };
    const hostKey = table.hostKey === playerKey ? remaining[0].key : table.hostKey;
    // Re-arm when the turn moved, or when the departing player was on the clock (bots move quickly).
    const rearm = state.turnIndex !== turnBefore || turnBefore === seat || state.phase === "showdown";
    await commit(ctx, table, state, { rearm, extra: { hostKey } });
    return null;
  },
});

export const start = mutation({
  args: { code: v.string(), playerKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerKey }) => {
    const table = await requireTable(ctx, code);
    if (table.hostKey !== playerKey) fail("hostOnly");
    if (table.status === "playing" && table.phase !== "showdown") fail("handActive");
    const state = toState(table);
    const now = Date.now();
    if (state.game === "poker") {
      for (let seat = state.players.length - 1; seat >= 0; seat--) if (state.players[seat].left) removeSeat(state, seat);
      startPokerHand(state, now);
    } else {
      startTrickGame(state, now);
    }
    await commit(ctx, table, state);
    return null;
  },
});

export const act = mutation({
  args: {
    code: v.string(), playerKey: v.string(), action: actionValidator,
    amount: v.optional(v.number()), bid: v.optional(v.number()), suit: v.optional(v.string()),
    card: v.optional(cardValidator), contract: v.optional(contractValidator),
  },
  returns: v.null(),
  handler: async (ctx, { code, playerKey, ...move }) => {
    const table = await requireTable(ctx, code);
    const state = toState(table);
    if (!turnIsLive(state)) fail("noHand");
    const seat = state.players.findIndex((p) => p.key === playerKey);
    if (seat < 0) fail("notSeated");
    performMove(state, seat, move, Date.now());
    await commit(ctx, table, state);
    return null;
  },
});

/** Busted poker players can top back up between hands (chips are just for fun). */
export const rebuy = mutation({
  args: { code: v.string(), playerKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerKey }) => {
    const table = await requireTable(ctx, code);
    const state = toState(table);
    const seat = state.players.findIndex((p) => p.key === playerKey);
    if (seat < 0) fail("notSeated");
    const player = state.players[seat];
    if (state.game !== "poker" || player.chips > 0) fail("notBroke");
    if (state.status === "playing" && !player.folded) fail("handActive");
    player.chips = STARTING_CHIPS;
    state.event = { kind: "rebuy", at: Date.now(), seat, name: player.name, amount: STARTING_CHIPS };
    await commit(ctx, table, state, { rearm: false });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* Internal                                                            */
/* ------------------------------------------------------------------ */

/** Fires when a turn timer elapses and plays a safe default move. No-ops if the turn already moved on. */
export const autoAct = internalMutation({
  args: { tableId: v.id("tables"), turnStartedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { tableId, turnStartedAt }) => {
    const table = await ctx.db.get("tables", tableId);
    if (!table || table.turnStartedAt !== turnStartedAt) return null;
    const state = toState(table);
    if (!turnIsLive(state)) return null;
    const move = state.game === "poker" ? autoPokerMove(state) : autoTrickMove(state);
    if (!move) return null;
    performMove(state, state.turnIndex, move, Date.now());
    // This job is the table's timer and is running now; cancelling it would also cancel the next one.
    await commit(ctx, { ...table, timerId: undefined }, state);
    return null;
  },
});

/** Removes abandoned tables in batches. Scheduled by the cron in crons.ts. */
export const cleanupStale = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const batch = 100;
    const stale = await ctx.db
      .query("tables")
      .withIndex("by_updatedAt", (q) => q.lt("updatedAt", Date.now() - STALE_MS))
      .take(batch);
    for (const table of stale) {
      await cancelTimer(ctx, table.timerId);
      await ctx.db.delete("tables", table._id);
    }
    if (stale.length === batch) await ctx.scheduler.runAfter(0, internal.tables.cleanupStale, {});
    return null;
  },
});
