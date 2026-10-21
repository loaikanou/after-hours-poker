import { ConvexReactClient } from "convex/react";
import { AVATARS, type Avatar } from "../../convex/model/types";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

/** Shared Convex client, or `null` when the backend URL is not configured. */
export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

const PLAYER_KEY = "after-hours-player-key";
const PLAYER_NAME = "after-hours-player-name";
const PLAYER_TABLE = "after-hours-table-code";
const PLAYER_AVATAR = "after-hours-avatar";

/** localStorage can throw (private mode, blocked storage); the app must still work. */
export function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* ignore */ }
}

function readPlayerKey(): string {
  const stored = readStorage(PLAYER_KEY);
  if (stored) return stored;
  const created = crypto.randomUUID();
  writeStorage(PLAYER_KEY, created);
  return created;
}

/** Stable anonymous identity for this device. */
export const playerKey = readPlayerKey();
export const savedName = readStorage(PLAYER_NAME) ?? "";
/** Code of the table this device last sat at, restored when the URL has none. */
export const savedTableCode = readStorage(PLAYER_TABLE) ?? "";
export const savedAvatar: Avatar = AVATARS.find((a) => a === readStorage(PLAYER_AVATAR)) ?? AVATARS[Math.floor(Math.random() * AVATARS.length)];

export function rememberPlayerName(name: string): void {
  writeStorage(PLAYER_NAME, name);
}

export function rememberAvatar(avatar: Avatar): void {
  writeStorage(PLAYER_AVATAR, avatar);
}

/** Persist the current table so a reload returns to it; pass an empty code to forget it. */
export function rememberTableCode(code: string): void {
  writeStorage(PLAYER_TABLE, code || null);
}
