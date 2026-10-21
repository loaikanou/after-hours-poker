import { useEffect } from "react";
import { setTurnAttention } from "../lib/pwa";

/**
 * While seated: keep the screen awake (phones dim mid-hand otherwise), and when
 * it's your turn badge the app icon and flag the tab title if you're elsewhere.
 */
export function useTableAttention(seated: boolean, myTurn: boolean, label: string) {
  useEffect(() => {
    const update = () => setTurnAttention(myTurn, label);
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      setTurnAttention(false, label);
    };
  }, [myTurn, label]);

  useEffect(() => {
    if (!seated || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible" || lock) return;
      try {
        lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => { lock = null; });
        if (disposed) void lock.release();
      } catch { /* denied or unsupported (e.g. low battery) */ }
    };
    void acquire();
    // The browser drops the lock when the page is hidden; take it back on return.
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [seated]);
}
