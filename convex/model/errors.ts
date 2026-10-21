import { ConvexError } from "convex/values";

/**
 * Every rule violation the server can report. The client maps each code to a
 * localized message, so wording lives in one place (src/i18n.ts).
 */
export const ERROR_CODES = [
  "notFound", "full", "handActive", "gameStarted", "hostOnly", "needPlayers", "needFourPlayers",
  "noHand", "notYourTurn", "notSeated", "callOrFold", "nothingToCall", "raiseTooSmall", "raiseTooLarge",
  "alreadyBid", "openingBid", "bidRange", "chooseBid", "chooseTrump", "chooseContract", "contractPlayed",
  "chooseCard", "illegalCard", "followSuit", "mustPlay", "actionUnavailable", "notBroke", "invalidInput",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type GameErrorData = { code: ErrorCode; amount?: number };

export function fail(code: ErrorCode, amount?: number): never {
  throw new ConvexError<GameErrorData>(amount === undefined ? { code } : { code, amount });
}
