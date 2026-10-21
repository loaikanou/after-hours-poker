import { v, type Infer } from "convex/values";

/** Shared validators and types for the game engine, the schema, and the public API. */

export const suitValidator = v.union(v.literal("♠"), v.literal("♥"), v.literal("♦"), v.literal("♣"));
export const cardValidator = v.object({ rank: v.number(), suit: v.string() });
export const gameValidator = v.union(v.literal("poker"), v.literal("tarneeb"), v.literal("trix"));
export const contractValidator = v.union(
  v.literal("king"), v.literal("diamonds"), v.literal("queens"), v.literal("collections"), v.literal("trix"),
);
export const phaseValidator = v.union(
  v.literal("waiting"), v.literal("preflop"), v.literal("flop"), v.literal("turn"), v.literal("river"),
  v.literal("showdown"), v.literal("bidding"), v.literal("trump"), v.literal("contract"), v.literal("trick"),
);
export const trickCardValidator = v.object({ playerIndex: v.number(), card: cardValidator });

export const playerValidator = v.object({
  key: v.string(),
  name: v.string(),
  avatar: v.optional(v.string()),
  chips: v.number(),
  bet: v.number(),
  /** Chips put into the pot over the whole hand; drives side-pot settlement. */
  committed: v.optional(v.number()),
  folded: v.boolean(),
  acted: v.boolean(),
  /** Set when the player walked away mid-hand; the server plays for them until the seat frees up. */
  left: v.optional(v.boolean()),
  cards: v.array(cardValidator),
});

export const eventKindValidator = v.union(
  v.literal("waiting"), v.literal("joined"), v.literal("left"), v.literal("rebuy"),
  v.literal("handStarted"), v.literal("fold"), v.literal("check"), v.literal("call"), v.literal("raise"), v.literal("allIn"),
  v.literal("takesPot"), v.literal("winsShowdown"), v.literal("splitPot"),
  v.literal("biddingStarted"), v.literal("bid"), v.literal("pass"), v.literal("bidWon"), v.literal("trumpChosen"),
  v.literal("choosingContract"), v.literal("contractStarted"), v.literal("cardPlayed"), v.literal("trickWon"),
  v.literal("tarneebHand"), v.literal("tarneebMatch"), v.literal("contractComplete"), v.literal("trixFinished"),
  v.literal("tournamentDone"),
);

/** A structured description of the last thing that happened; the client localizes and animates it. */
export const eventValidator = v.object({
  kind: eventKindValidator,
  at: v.number(),
  seat: v.optional(v.number()),
  name: v.optional(v.string()),
  amount: v.optional(v.number()),
  card: v.optional(cardValidator),
  suit: v.optional(v.string()),
  contract: v.optional(contractValidator),
  team: v.optional(v.number()),
  made: v.optional(v.boolean()),
  hand: v.optional(v.string()),
  names: v.optional(v.array(v.string())),
});

export const winnerValidator = v.object({
  seat: v.number(),
  amount: v.number(),
  hand: v.optional(v.string()),
  cards: v.optional(v.array(cardValidator)),
});

export const lastTrickValidator = v.object({ cards: v.array(trickCardValidator), winner: v.number() });

export type Card = Infer<typeof cardValidator>;
export type Game = Infer<typeof gameValidator>;
export type Contract = Infer<typeof contractValidator>;
export type Phase = Infer<typeof phaseValidator>;
export type TrickCard = Infer<typeof trickCardValidator>;
export type Player = Infer<typeof playerValidator>;
export type TableEvent = Infer<typeof eventValidator>;
export type EventKind = Infer<typeof eventKindValidator>;
export type Winner = Infer<typeof winnerValidator>;
export type LastTrick = Infer<typeof lastTrickValidator>;

/** The mutable game state the engine works on (a table document minus system/bookkeeping fields). */
export type GameState = {
  game: Game;
  status: "lobby" | "playing";
  phase: Phase;
  board: Card[];
  pot: number;
  currentBet: number;
  lastRaise: number;
  turnIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  players: Player[];
  deck: Card[];
  event: TableEvent;
  winners: Winner[];
  bids: number[];
  highBid: number;
  bidder: number;
  trump: string | undefined;
  trickCards: TrickCard[];
  lastTrick: LastTrick | undefined;
  tricksWon: number[];
  scores: number[];
  trickPiles: Card[][];
  trixPicker: number;
  kingdomsCompleted: number;
  trixContractsPlayed: Contract[];
  finishOrder: number[];
  contract: Contract | undefined;
};

export const SUITS = ["♠", "♥", "♦", "♣"] as const;
export const CONTRACTS: Contract[] = ["king", "diamonds", "queens", "collections", "trix"];
export const STARTING_CHIPS = 1000;
export const MAX_PLAYERS: Record<Game, number> = { poker: 6, tarneeb: 4, trix: 4 };
export const TARNEEB_TARGET = 31;
export const TRIX_KINGDOMS = 4;

/** Character portraits a player can pick; the client draws them. */
export const AVATARS = ["fox", "owl", "bear", "cat", "panda", "wolf", "rabbit", "tiger"] as const;
export type Avatar = (typeof AVATARS)[number];
