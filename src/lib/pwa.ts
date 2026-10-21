import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "./session";
import { asset, BASE_URL } from "./paths";

/**
 * Everything PWA lives here: install-prompt capture, standalone detection,
 * service-worker registration and update handling. State is a tiny external
 * store so any component can subscribe with `usePwa()`.
 *
 * `beforeinstallprompt` can fire before React mounts, so listeners are attached
 * at module load (this file is imported from main.tsx).
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type Platform = "ios" | "android" | "desktop";

export type PwaState = {
  /** The browser offered a native install prompt we can trigger. */
  canPrompt: boolean;
  /** Running as an installed app (standalone window / home-screen launch). */
  installed: boolean;
  platform: Platform;
  /** A new service worker is waiting; applying it reloads the page. */
  updateReady: boolean;
  /** First successful offline cache of the app shell. */
  offlineReady: boolean;
};

const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
const platform: Platform = isIOS ? "ios" : /android/i.test(ua) ? "android" : "desktop";

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: window-controls-overlay)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

let deferredPrompt: InstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let state: PwaState = { canPrompt: false, installed: standalone(), platform, updateReady: false, offlineReady: false };
const listeners = new Set<() => void>();

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    set({ canPrompt: false, installed: true });
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", () => set({ installed: standalone() }));
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
    () => state,
  );
}

/** Show the native install dialog. Resolves to whether the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  set({ canPrompt: false });
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome === "accepted";
}

/* ---------- Install nudges ---------- */

const VISITS_KEY = "after-hours-visits";
const SNOOZE_KEY = "after-hours-install-snoozed";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const visits = Number(readStorage(VISITS_KEY) ?? 0) + 1;
writeStorage(VISITS_KEY, String(visits));

/** Only nudge returning visitors, and never again for two weeks after "Not now". */
export function shouldNudgeInstall(current: PwaState): boolean {
  if (current.installed || !(current.canPrompt || current.platform === "ios")) return false;
  const snoozed = Number(readStorage(SNOOZE_KEY) ?? 0);
  return visits >= 2 && Date.now() - snoozed > SNOOZE_MS;
}

export function snoozeInstallNudge() {
  writeStorage(SNOOZE_KEY, String(Date.now()));
}

/* ---------- Service worker ---------- */

let reloading = false;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloading && waitingWorker) { reloading = true; window.location.reload(); }
  });
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(asset("sw.js"), { scope: BASE_URL, updateViaCache: "none" });
      const track = (worker: ServiceWorker | null) => {
        worker?.addEventListener("statechange", () => {
          if (worker.state !== "installed") return;
          // With a controller this is an update; without one it's the first install.
          if (navigator.serviceWorker.controller) { waitingWorker = worker; set({ updateReady: true }); }
          else if (!readStorage("after-hours-pwa-ready")) { writeStorage("after-hours-pwa-ready", "1"); set({ offlineReady: true }); }
        });
      };
      if (registration.waiting && navigator.serviceWorker.controller) { waitingWorker = registration.waiting; set({ updateReady: true }); }
      track(registration.installing);
      registration.addEventListener("updatefound", () => track(registration.installing));
      // Look for a new version whenever the app comes back to the foreground, and hourly while open.
      const check = () => { void registration.update().catch(() => undefined); };
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
      window.setInterval(check, 60 * 60 * 1000);
    } catch { /* PWA features are progressive */ }
  });
}

export function applyUpdate() {
  waitingWorker?.postMessage({ type: "SKIP_WAITING" });
}

export function dismissPwaToast() {
  set({ updateReady: false, offlineReady: false });
}

/* ---------- Installed-app niceties ---------- */

/** App-icon badge (installed PWAs) and tab-title cue when it's your turn and the app is in the background. */
export function setTurnAttention(active: boolean, title: string) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (active) void nav.setAppBadge?.(1).catch(() => undefined);
  else void nav.clearAppBadge?.().catch(() => undefined);
  const base = document.title.replace(/^● .*? · /, "");
  document.title = active && document.visibilityState === "hidden" ? `● ${title} · ${base}` : base;
}
