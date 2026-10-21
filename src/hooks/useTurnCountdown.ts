import { useEffect, useRef, useState } from "react";

export type Countdown = { remainingMs: number; progress: number; seconds: number; urgent: boolean };

const TICK_MS = 250;
const URGENT_MS = 10_000;

/**
 * Counts a server-stamped turn down on the client.
 *
 * The query cannot read the wall clock, so the backend only hands us the
 * timestamp the turn began. We anchor the countdown to the moment this client
 * first sees that timestamp (clamped into the turn window) which keeps it
 * accurate even when the device clock drifts, and we only tick while a turn is
 * actually live so idle tables stay completely still.
 */
export function useTurnCountdown(startedAt: number, durationMs: number, active: boolean): Countdown {
  const anchor = useRef(0);
  const seenStart = useRef(-1);
  const [, tick] = useState(0);

  if (seenStart.current !== startedAt) {
    seenStart.current = startedAt;
    const elapsed = durationMs > 0 ? Math.min(durationMs, Math.max(0, Date.now() - startedAt)) : 0;
    anchor.current = Date.now() - elapsed;
  }

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => tick((value) => value + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [active, startedAt]);

  if (!active || durationMs <= 0) {
    return { remainingMs: durationMs, progress: 1, seconds: Math.ceil(durationMs / 1000), urgent: false };
  }
  const remainingMs = Math.max(0, durationMs - (Date.now() - anchor.current));
  return { remainingMs, progress: remainingMs / durationMs, seconds: Math.ceil(remainingMs / 1000), urgent: remainingMs <= URGENT_MS };
}
