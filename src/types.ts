import type { FunctionReturnType } from "convex/server";
import type { api } from "../convex/_generated/api";

/** The table snapshot returned by `api.tables.get`, derived straight from the backend validator. */
export type TableSnapshot = NonNullable<FunctionReturnType<typeof api.tables.get>>;
export type VisiblePlayer = TableSnapshot["players"][number];
export type Card = VisiblePlayer["cards"][number];
export type GameMode = TableSnapshot["game"];
export type TablePhase = TableSnapshot["phase"];
export type Contract = NonNullable<TableSnapshot["contract"]>;
export type TableEvent = TableSnapshot["event"];

export type PokerAction = "fold" | "check" | "call" | "raise" | "allIn";
export type GameAction = "bid" | "pass" | "trump" | "play" | "selectContract";
export type ActionValues = { amount?: number; bid?: number; suit?: string; card?: Card; contract?: Contract };

/** A seat's centre on the felt, in percent of the felt's width/height. */
export type SeatPoint = { x: number; y: number };

export type { Avatar } from "../convex/model/types";
